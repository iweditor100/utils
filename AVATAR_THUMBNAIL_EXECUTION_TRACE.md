# Avatar Thumbnail Generation — Full Execution Trace

This document traces exactly how `thumb_256.webp` is triggered and produced, from the frontend through the backend to R2 and the database. No code is modified; this is a runtime and architectural explanation.

---

## 1. Frontend Flow

### 1.1 Entry point: which component triggers upload

**File:** `frontend/src/components/UserProfile/UserMetaCard.tsx`

The component that starts the avatar flow is **UserMetaCard**. It:

- Renders a hidden file input (`<input type="file" accept="image/jpeg,image/png,image/webp" />`) and a visible button that opens it.
- Uses the hook `useAvatarUpload()` from `frontend/src/hooks/useAvatarUpload.ts`, which exposes a single function `uploadAvatar`.
- When the user selects a file, the input’s `onChange` fires **handleFileChange** (lines 65–81).
- **handleFileChange** reads `e.target.files?.[0]`, clears the input value, sets `isUploading` true, then calls **`await uploadAvatar(file)`** (line 75). When that promise resolves, it sets `isUploading` false. Any thrown error is caught and shown in `uploadError`.

So: **the exact request that ultimately causes thumbnail creation is triggered by the user selecting a file in this file input**, which leads to `uploadAvatar(file)`.

### 1.2 What `uploadAvatar` does (step-by-step)

**File:** `frontend/src/hooks/useAvatarUpload.ts`

**Function:** `uploadAvatar` (lines 21–57), returned by `useAvatarUpload()`.

Execution order:

1. **Client-side validation**  
   Checks `file.type` is one of `image/jpeg`, `image/png`, `image/webp` and `file.size` ≤ 2MB. Throws if not.

2. **Presign request**  
   Calls `presign({ fileName: file.name, fileSize: file.size, mimeType: file.type, category: "avatar" }).unwrap()`.  
   - `presign` comes from **usePresignUploadMutation()** from **uploadsApi** (`frontend/src/features/uploads/uploadsApi.ts`).  
   - That mutation sends **POST** to **`/uploads/presign`** with body `{ fileName, fileSize, mimeType, category: "avatar" }`.  
   - The frontend uses **baseQueryWithReauth** and **axiosClient**; the request URL is **`env.API_URL + "uploads/presign"`** (e.g. `http://localhost:4000/uploads/presign`).  
   - Response is expected to have `data: { uploadUrl, key }`.

3. **Direct upload to R2**  
   Uses `fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })`.  
   - This is a **direct PUT to the presigned R2 URL**; no backend in the middle.  
   - If `!putRes.ok`, throws "Upload to storage failed."

4. **Build picture URL and update profile**  
   - `pictureUrl = getPublicUrlForKey(key)`.  
   - **getPublicUrlForKey** (lines 9–15) does: `env.R2_PUBLIC_BASE_URL` (from `frontend/src/config/env.ts`: `VITE_R2_PUBLIC_BASE_URL` or `""`) with trailing slash stripped, then `return \`${base}/${key}\``.  
   - So `pictureUrl` is the **original** object’s public URL, e.g. `https://<r2-public-base>/avatars/<userId>/original.jpg`.  
   - Then **`await updateProfile({ picture: pictureUrl }).unwrap()`**.  
   - `updateProfile` is **useUpdateMyProfileMutation()** from **usersApi** (`frontend/src/features/users/usersApi.ts`).  
   - That mutation sends **PATCH** to **`/user/me`** with body **`{ picture: pictureUrl }`**.

So the **exact request that causes thumbnail creation** is this **PATCH to `/user/me`** with **`{ picture: "<R2_PUBLIC_BASE_URL>/avatars/<userId>/original.<ext>" }`**. That request is sent by the frontend **after** the R2 PUT succeeds; the backend then updates the user and starts avatar processing (including resize).

### 1.3 Data passed from frontend to backend (for avatar path)

- **Presign:** `POST /uploads/presign` → `{ fileName, fileSize, mimeType, category: "avatar" }`. Backend returns `{ uploadUrl, key }` where `key` is e.g. `avatars/<userId>/original.<ext>` (backend builds this from `userId` and file extension).
- **Profile update:** `PATCH /user/me` → `{ picture: pictureUrl }` where `pictureUrl = R2_PUBLIC_BASE_URL + "/" + key` (same key). So the backend receives the **original** image’s public URL.

**Environment variables (frontend):**

- **VITE_API_URL** (or default `http://localhost:4000/`): base URL for API (presign and PATCH).
- **VITE_R2_PUBLIC_BASE_URL**: base for building `pictureUrl` after upload.

**Runtime:** Browser (React, Redux RTK Query, axios). No Worker runs in the frontend for this flow.

---

## 2. Backend Route Triggered

### 2.1 Route mounting

**File:** `backend/src/routes/index.ts`  
- **userRoutes** are mounted at **`/user`** (line 20: `router.use("/user", userRoutes)`).

**File:** `backend/src/modules/users/user.routes.ts`  
- Router uses **authenticateMiddleware** (so all routes require auth).  
- **PATCH `/me`** is handled by **updateMyProfileController** (line 9: `router.patch("/me", updateMyProfileController)`).

So the full path for the profile update is **PATCH `/user/me`** (e.g. `http://localhost:4000/user/me`). That is the route that leads to thumbnail generation.

### 2.2 Presign route (for completeness)

**File:** `backend/src/routes/index.ts`  
- **uploadsRouter** is mounted at **`/uploads`** (line 23).

**File:** `backend/src/modules/uploads/uploads.routes.ts`  
- **POST `/presign`** is handled by **presignUploadController** (with **authenticateMiddleware**).

So **POST `/uploads/presign`** returns the presigned URL and key; it does **not** trigger resize. Resize is triggered only by **PATCH `/user/me`** with a new `picture` URL.

---

## 3. Controller Execution

**File:** `backend/src/modules/users/controllers/updateMyProfile.controller.ts`  
**Function:** **updateMyProfileController** (exported async function).

**Runtime:** Node.js (Express).

Execution order:

1. **Auth**  
   Reads `(req as any).user.userId`. If missing, responds with 401 and returns; no DB or resize.

2. **Validation**  
   **updateMyProfileSchema.safeParse(req.body)**. If invalid, responds with 400 and returns.

3. **Parse body**  
   `const { name, picture } = parse.data`.

4. **DB: get existing user**  
   **getPrisma()** from `backend/src/prisma/client.ts` (singleton PrismaClient).  
   **prisma.user.findUnique({ where: { id: userId } })**. If no user, responds with 404 and returns.

5. **Build update payload**  
   `updateData = {}`; if `name !== undefined` then `updateData.name = name`; if `picture !== undefined` then `updateData.picture = picture`.

6. **DB: first update (original URL)**  
   **await prisma.user.update({ where: { id: userId }, data: updateData, select: { id, name, email, picture, status, emailVerifiedAt } })**.  
   So **user.picture is first set to the original image URL** (the `pictureUrl` sent by the frontend, e.g. `https://<r2-public>/avatars/<userId>/original.jpg`).  
   Result is stored in **updatedUser**.

7. **Start avatar processing (resize)**  
   **If `picture !== undefined`:**  
   **`void processAvatar(userId, picture).catch((err) => { console.error("[avatarProcessing]", err); });`**  
   - **processAvatar** is imported from **`../services/avatarProcessing.service`** (`backend/src/modules/users/services/avatarProcessing.service.ts`).  
   - It is **not awaited**. The controller does not wait for resize or R2 upload or the second DB update.  
   - So: **resize is fire-and-forget**. The HTTP response is sent after step 8, regardless of whether processAvatar has finished or failed.

8. **Respond to client**  
   **return sendSuccess(res, USER_CODES.USER_UPDATE_SUCCESS, { user: updatedUser }, HTTP_STATUS.OK)**.  
   The client receives **updatedUser** with **picture** still set to the **original** URL at response time.

So: the **exact call that starts thumbnail creation** is **processAvatar(userId, picture)** in this controller, where `picture` is the original image’s public URL. It runs only when the client sent a new `picture` and only after the first DB update has completed.

---

## 4. Avatar Processing Service Execution

**File:** `backend/src/modules/users/services/avatarProcessing.service.ts`  
**Function:** **processAvatar(userId: string, pictureUrl: string): Promise<void>`** (exported).

**Runtime:** Node.js (same process as Express). No Worker.

Execution order:

1. **Extract R2 key from URL**  
   **extractAvatarKeyFromUrl(pictureUrl)** (local function, lines 10–18):  
   - `new URL(pictureUrl)`; take `url.pathname`, strip leading `/`.  
   - If path does not start with `"avatars/"`, return **null**.  
   - Otherwise return the path (e.g. `avatars/<userId>/original.jpg`).  
   If **null**, **processAvatar** returns immediately without doing anything (no download, no resize, no DB update).

2. **Build thumb key**  
   `parts = originalKey.split("/")` (e.g. `["avatars", "<userId>", "original.jpg"]`).  
   If `parts.length < 2`, return.  
   `basePath = parts.slice(0, -1).join("/")` → e.g. `"avatars/<userId>"`.  
   **`thumbKey = \`${basePath}/thumb_256.webp\``** → e.g. **`avatars/<userId>/thumb_256.webp`**.

3. **Download original from R2**  
   **await getObjectFromR2(originalKey)**.  
   - **getObjectFromR2** is in **`backend/src/infra/storage/storage.service.ts`**.  
   - If it returns **null** (object not found), **processAvatar** returns without resize or DB update.

4. **Resize with sharp**  
   **await sharp(buffer).resize(256, 256, { fit: "cover" }).webp({ quality: 80 }).toBuffer()**.  
   - **sharp** is imported from the **sharp** package (Node native addon).  
   - This is the **only place sharp is invoked** in this flow.  
   - Output is a **Buffer** of WebP image data.

5. **Upload thumb to R2**  
   **await putObjectToR2(thumbKey, thumbBuffer, "image/webp")**.  
   - **putObjectToR2** is in the same **storage.service.ts**.  
   - So the object key used for the thumbnail is exactly **`avatars/<userId>/thumb_256.webp`**.

6. **Build thumb URL**  
   `baseUrl = env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")` (from **backend/src/config/env.ts**).  
   **`thumbUrl = \`${baseUrl}/${thumbKey}\``** → e.g. `https://<r2-public>/avatars/<userId>/thumb_256.webp`.

7. **Second DB update**  
   **getPrisma()** again; then **await prisma.user.updateMany({ where: { id: userId }, data: { picture: thumbUrl } })**.  
   So **user.picture** is **overwritten** from the original URL to the **thumb** URL.

So: **processAvatar** is the only place that calls sharp, forms the thumb key, uploads the thumb to R2, and updates the user to the thumb URL. It runs asynchronously after the controller has already responded.

---

## 5. Sharp Invocation Details

**File:** `backend/src/modules/users/services/avatarProcessing.service.ts`  
**Line:** 39–42 (approximately).

**Code:**

```ts
const thumbBuffer = await sharp(buffer)
  .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
  .webp({ quality: WEBP_QUALITY })
  .toBuffer();
```

- **THUMB_SIZE** = 256 (constant at top of file).  
- **WEBP_QUALITY** = 80.

**Input:** `buffer` is the **Buffer** returned by **getObjectFromR2(originalKey)** (raw bytes of the original image from R2: JPEG, PNG, or WebP).

**Behavior:**  
- **sharp(buffer)** creates a sharp pipeline from that buffer.  
- **.resize(256, 256, { fit: "cover" })** resizes so the image fits in 256×256, cropping to cover (center crop).  
- **.webp({ quality: 80 })** encodes as WebP at quality 80.  
- **.toBuffer()** returns a Promise that resolves to a Buffer of the WebP bytes.

**Runtime:** Node.js, in the same process as the Express server. Sharp runs on the **backend** only; no Cloudflare Worker or browser is involved in this step.

**When it runs:** Only when **processAvatar** is invoked by the controller (after the first DB update), and only after **getObjectFromR2** has successfully returned a non-null buffer. If extraction of `originalKey` fails or R2 get returns null, sharp is never called.

---

## 6. R2 Download + Upload Flow

### 6.1 R2 client and config

**File:** `backend/src/infra/storage/r2.client.ts`  
- **r2Client** is an **S3Client** from **@aws-sdk/client-s3** with:  
  - **endpoint:** `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`  
  - **credentials:** `env.R2_ACCESS_KEY_ID`, `env.R2_SECRET_ACCESS_KEY`  
  - **region:** `"auto"`  
  - **requestChecksumCalculation / responseChecksumValidation:** `"NEVER"`

**File:** `backend/src/infra/storage/storage.config.ts`  
- **STORAGE_CONFIG.bucket** = **env.R2_BUCKET**  
- **STORAGE_CONFIG.publicBaseUrl** = **env.R2_PUBLIC_BASE_URL**  
- (Presign expiry is also from env; not used in get/put.)

**Environment variables (backend)** used for R2 in this flow:  
- **R2_ACCOUNT_ID**, **R2_ACCESS_KEY_ID**, **R2_SECRET_ACCESS_KEY**, **R2_BUCKET**, **R2_PUBLIC_BASE_URL** (from **backend/src/config/env.ts**).

### 6.2 Download (getObjectFromR2)

**File:** `backend/src/infra/storage/storage.service.ts`  
**Function:** **getObjectFromR2(key: string): Promise<Buffer | null>`**

- Builds **GetObjectCommand** with **Bucket: STORAGE_CONFIG.bucket**, **Key: key** (e.g. `avatars/<userId>/original.jpg`).  
- **await r2Client.send(command)**.  
- If **response.Body** is absent, returns **null**.  
- Otherwise consumes the body as an **AsyncIterable<Uint8Array>**, collects chunks into an array, then **Buffer.concat(chunks)** and returns that buffer.  
- So the **original image bytes** are read from R2 (the same bucket the frontend uploaded to via presigned URL) and returned to the caller.  
- **Caller:** only **processAvatar** in **avatarProcessing.service.ts**, which passes **originalKey** (derived from the picture URL path).

### 6.3 Thumb key construction

**File:** `backend/src/modules/users/services/avatarProcessing.service.ts`

- **originalKey** = path from URL, e.g. `avatars/<userId>/original.jpg`.  
- **parts** = `originalKey.split("/")` → e.g. `["avatars", "<userId>", "original.jpg"]`.  
- **basePath** = `parts.slice(0, -1).join("/")` → `"avatars/<userId>"`.  
- **thumbKey** = **`\`${basePath}/thumb_256.webp\``** → **`avatars/<userId>/thumb_256.webp`**.  
- This string is passed to **putObjectToR2(thumbKey, thumbBuffer, "image/webp")**. No other logic or regex; the thumb is always at that key pattern for the given user.

### 6.4 Upload (putObjectToR2)

**File:** `backend/src/infra/storage/storage.service.ts`  
**Function:** **putObjectToR2(key: string, body: Buffer, contentType = "image/webp"): Promise<void>`**

- Builds **PutObjectCommand** with **Bucket: STORAGE_CONFIG.bucket**, **Key: key**, **Body: body**, **ContentType: contentType**.  
- **await r2Client.send(new PutObjectCommand(...))**.  
- So the thumbnail (WebP buffer from sharp) is written to R2 at **key** = **`avatars/<userId>/thumb_256.webp`**, with **Content-Type: image/webp**.  
- Same bucket and same R2 client as the download; only the key differs (original vs thumb).

---

## 7. Prisma Update Flow

### 7.1 First update (in controller)

**File:** `backend/src/modules/users/controllers/updateMyProfile.controller.ts`

- **getPrisma()** from **backend/src/prisma/client.ts**: returns the singleton **PrismaClient** (configured with **env.DATABASE_URL** from **backend/src/config/env.ts**).  
- **prisma.user.update({ where: { id: userId }, data: updateData, select: {...} })**.  
- When the client sent **picture**, **updateData.picture** is the **original** URL (e.g. `https://<r2-public>/avatars/<userId>/original.jpg`).  
- So **user.picture** is first set to the **original** image URL.  
- This update is **awaited**; the response is not sent until it completes.

### 7.2 Second update (in processAvatar)

**File:** `backend/src/modules/users/services/avatarProcessing.service.ts`

- After uploading the thumb to R2, **getPrisma()** is called again (same singleton).  
- **prisma.user.updateMany({ where: { id: userId }, data: { picture: thumbUrl } })**.  
- **thumbUrl** = **`env.R2_PUBLIC_BASE_URL` + "/" + thumbKey** = e.g. `https://<r2-public>/avatars/<userId>/thumb_256.webp`.  
- So **user.picture** is **overwritten** to the **thumbnail** URL.  
- This update is **awaited** inside **processAvatar**, but **processAvatar** itself is not awaited by the controller.

**Order relative to resize:**  
1. Controller: first Prisma update (original URL) — **before** any resize.  
2. processAvatar: R2 get → sharp resize → R2 put → second Prisma update (thumb URL).  
So the **DB is updated to the original URL first**, then **later** (asynchronously) updated to the thumb URL when processAvatar finishes.

---

## 8. Async vs Sync Behavior

### 8.1 What is awaited and what is not

- **Frontend:**  
  - **uploadAvatar** awaits: presign response, R2 PUT, and **updateProfile** (PATCH response). So the user sees “upload done” when the PATCH has completed and the client has received **updatedUser** with **picture = original URL**.

- **Backend controller:**  
  - Awaits: validation, findUnique, **prisma.user.update** (first update).  
  - Does **not** await: **processAvatar(userId, picture)**. It runs **void processAvatar(...).catch(...)**.  
  - So the HTTP response is sent **immediately after** the first DB update, **without waiting** for download, resize, R2 upload, or second DB update.

- **processAvatar (background):**  
  - Awaits: getObjectFromR2, sharp pipeline, putObjectToR2, prisma.user.updateMany.  
  - So inside processAvatar everything is sequential and awaited; the second DB update happens only after the thumb is in R2.

### 8.2 Summary

- **Resize is fire-and-forget** from the controller’s perspective.  
- **Synchronous from the client’s point of view:** the request that “triggers” the resize is **PATCH /user/me**; the client gets a 200 with **user.picture = original URL** and does not wait for the thumb.  
- **Asynchronous in the backend:** after the response is sent, processAvatar runs in the background and eventually updates **user.picture** to the thumb URL. So there is a time window where the DB has the original URL; later it has the thumb URL (unless processAvatar fails).

### 8.3 Parallelism

- No explicit parallelism in this flow. The controller does one thing (update profile, then kick off processAvatar). processAvatar does: get → resize → put → update, all in sequence.  
- Other HTTP requests can be handled in parallel by Express, but a single avatar upload does not run multiple resize jobs in parallel.

---

## 9. Failure Scenarios

### 9.1 extractAvatarKeyFromUrl returns null

- **When:** pictureUrl is not a valid URL or path does not start with `"avatars/"`.  
- **Effect:** processAvatar returns at the start. No R2 get, no sharp, no R2 put, no second DB update.  
- **user.picture:** stays as the **original** URL (set by the first Prisma update).  
- **Observability:** No throw; no `.catch` in the controller is run. Only optional logging if added.

### 9.2 getObjectFromR2 returns null

- **When:** R2 GetObject returns no body or object not found.  
- **Effect:** processAvatar returns after the null check. No sharp, no put, no second DB update.  
- **user.picture:** stays as the **original** URL.  
- **Observability:** Same as above.

### 9.3 sharp fails (e.g. corrupt image, unsupported format)

- **When:** sharp(buffer).resize(...).webp(...).toBuffer() throws.  
- **Effect:** processAvatar throws. The controller’s **.catch((err) => { console.error("[avatarProcessing]", err); })** runs. Error is logged; promise rejection is handled.  
- **user.picture:** stays as the **original** URL (second update never runs).  
- **Client:** already got 200; no automatic retry or notification.

### 9.4 putObjectToR2 fails (e.g. R2 write error)

- **When:** r2Client.send(PutObjectCommand) throws.  
- **Effect:** processAvatar throws; same .catch in controller logs the error.  
- **user.picture:** stays as the **original** URL. Thumb may not exist in R2.  
- **Client:** unchanged; no second request.

### 9.5 Second Prisma update fails

- **When:** prisma.user.updateMany(...) throws (e.g. DB down, constraint).  
- **Effect:** processAvatar throws; controller .catch logs it.  
- **R2:** thumb has already been written. So R2 can have the thumb while DB still has the original URL (inconsistent until/unless a retry or manual fix).

### 9.6 Summary

- **Resize or R2 or second DB failure:** user.picture remains the **original** URL; error is only logged in the backend. No retry, no dead-letter, no notification to the client.  
- **First DB update failure:** controller sends an error response; processAvatar is never called (picture is in updateData only when provided, and if the update throws, the controller doesn’t reach the processAvatar line).

---

## 10. Final State of System

### 10.1 When everything succeeds

- **R2:**  
  - **Original:** `avatars/<userId>/original.<ext>` (uploaded by the frontend via presigned PUT).  
  - **Thumb:** `avatars/<userId>/thumb_256.webp` (written by backend via putObjectToR2 after sharp resize).

- **Database (user.picture):**  
  - **Final value:** the **thumbnail** URL, e.g. `https://<R2_PUBLIC_BASE_URL>/avatars/<userId>/thumb_256.webp`.  
  - So **user.picture** is intended to point at the **thumb**, not the original, once processAvatar has completed successfully.

- **Client:**  
  - Received 200 and **user** with **picture = original** URL at response time.  
  - If the client or UI later refetches the user (e.g. via auth state or another API), it can then see **picture = thumb** URL.

### 10.2 Who calls what (concise)

| Step | File | Function / action |
|------|------|--------------------|
| User selects file | UserMetaCard.tsx | handleFileChange → uploadAvatar(file) |
| Presign | useAvatarUpload.ts | presign() → POST /uploads/presign |
| Presign handler | uploads.controller.ts | presignUploadController |
| Presign service | uploads.service.ts | presignUpload → presignPutObject (storage.service) |
| Client uploads to R2 | useAvatarUpload.ts | fetch(uploadUrl, PUT) (direct to R2) |
| Profile update request | useAvatarUpload.ts | updateProfile({ picture: pictureUrl }) → PATCH /user/me |
| Profile route | user.routes.ts | PATCH /me → updateMyProfileController |
| First DB update | updateMyProfile.controller.ts | prisma.user.update (picture = original URL) |
| Start resize | updateMyProfile.controller.ts | void processAvatar(userId, picture).catch(...) |
| Extract key | avatarProcessing.service.ts | extractAvatarKeyFromUrl(pictureUrl) |
| Thumb key | avatarProcessing.service.ts | basePath + "/thumb_256.webp" |
| R2 download | storage.service.ts | getObjectFromR2(originalKey) |
| Resize | avatarProcessing.service.ts | sharp(buffer).resize(256,256,{fit:"cover"}).webp({quality:80}).toBuffer() |
| R2 upload | storage.service.ts | putObjectToR2(thumbKey, thumbBuffer, "image/webp") |
| Second DB update | avatarProcessing.service.ts | prisma.user.updateMany({ picture: thumbUrl }) |

### 10.3 Environment variables involved

- **Backend:** R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL (R2 and thumb URL); DATABASE_URL (Prisma).  
- **Frontend:** VITE_API_URL (API base for presign and PATCH), VITE_R2_PUBLIC_BASE_URL (build picture URL from key).

### 10.4 Runtime summary

- **Frontend:** Browser.  
- **Backend (presign, controller, processAvatar, sharp, R2 get/put, Prisma):** Node.js (Express), single process.  
- **Cloudflare Worker:** Not used for avatar resize or thumbnail generation in this flow.

This is the full execution trace for how avatar thumbnail generation (**thumb_256.webp**) is triggered and executed in this codebase.
