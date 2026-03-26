# 🧾 BACKEND AUDIT REPORT
> **Audited:** 2026-03-25
> **Auditor:** Staff Backend Engineer + Security Auditor + SRE
> **Scope:** `backend/src/` + `frontend/src/` (auth, storage, sockets, downloads)
> **Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Redis + BullMQ + Socket.IO + Cloudflare R2
> **Verdict:** ❌ NOT production-ready — 4 critical vulnerabilities must be resolved before any public deployment

---

## 🟢 Production-Ready Components

| Component | Why it's solid |
|---|---|
| **JWT structure** | HS256 with 15-min expiry, proper `iss`/`aud` claims, `clockTolerance: 5` |
| **Refresh token rotation** | Replay detection via `replacedById` chain; reuse triggers full session revocation; HMAC-SHA256 with `timingSafeEqual` |
| **Zod env validation** | `config/env.ts` Zod schema exits the process cleanly on missing/malformed env at startup |
| **R2 presigned PUT with ContentLength** | `storage.service.ts` binds `ContentLength` in the signed headers, limiting upload size at the CDN layer |
| **Prisma tagged template `$executeRaw`** | PostGIS queries in `service-area.service.ts` use bound parameters — no SQL injection |
| **Image worker idempotency** | `HeadObject` check before re-processing thumbnails; avoids duplicate work on retry |
| **BullMQ job deduplication** | ZIP jobs use `jobId` format `zip:${userId}:${timestamp}` — prevents exact duplicates |
| **OAuth CSRF nonce** | State nonce stored in Redis with 10-min TTL, deleted on first use — CSRF protection is correct |
| **Refresh token cookie** | `HttpOnly`, `SameSite: strict`, `secure` in production — not accessible from JS |
| **Pino structured logging** | Redacts `authorization`, `cookie`, `password`, `token` from logs |
| **Google `email_verified` check** | `googleOAuth.service.ts` validates `payload.email_verified` and issuer |
| **Upload ownership query** | `findUploadsByKeysAndOwner` scopes Prisma query to `{ key: { in: keys }, ownerId }` — correct |
| **Socket job isolation** | `useZipDownload.ts` verifies `data.jobId === jobId` before acting on socket events |

---

## 🔴 Critical Vulnerabilities (Must Fix Before Launch)

---

### CRIT-01 — Live Secrets Committed to Repository

**Location:** `backend/src/infra/storage/.env`

**Impact:** Complete infrastructure compromise — R2 bucket, SMTP account, database, JWT signing keys all exposed.

**Exposed secrets (currently in git tree):**
```
ACCESS_TOKEN_SECRET=dev_access_token_secret_12345678901234567890   # weak, predictable
REFRESH_TOKEN_SECRET=dev_refresh_token_secret_12345678901234567890
R2_ACCESS_KEY_ID=a3f6dccd79b0b7384920f20ec62f7acc
R2_SECRET_ACCESS_KEY=db9418d7c14abd92a590bd1e57c2e65371cadb99d75178e277b8e9c5aa3da3ba
SMTP_PASS=rbil vjyx ymoq rsja                                       # Gmail app password
R2_ACCOUNT_ID=d66f7fe1c45c6c0147798dfdefa40dc5
DATABASE_URL=postgresql://postgres:iwdev@localhost:5432/iwcrm
TOKEN_VALUE=y35jScaONbz2fU25EV3MVc_fISJ0CMUP4TvljnIG
```

**Exploit scenario:**
1. Clone/fork the repo (or browse GitHub if public) — all secrets instantly visible.
2. Authenticate to R2 with the key pair → read, modify, or delete every file in the bucket.
3. Sign arbitrary JWTs with the leaked `ACCESS_TOKEN_SECRET` → impersonate any user with any role.
4. Relay emails through the SMTP account.
5. Connect to the PostgreSQL database if exposed.

**Fix:**
1. **Immediately rotate every secret above** — assume all are compromised.
2. Move `.env` to project root (not inside `src/`), add `**/.env` to `.gitignore`.
3. Remove the file from git history: `git filter-repo --path backend/src/infra/storage/.env --invert-paths`.
4. Replace weak JWT secrets with cryptographically random 64-byte hex values: `openssl rand -hex 64`.

---

### CRIT-02 — Socket.IO Room Hijacking (Zero Auth)

**Location:** `backend/src/infra/socket/socket.ts` lines 14-22

**Impact:** Any authenticated user can receive any other user's real-time events (download completion, calendar updates, future notifications).

**Code:**
```typescript
const userId = socket.handshake.auth?.userId;
if (!userId) {
    socket.disconnect();
    return;
}
socket.join(`user:${userId}`);  // no verification that this userId matches the JWT
```

**Exploit scenario:**
1. Attacker authenticates (gets a valid JWT for user `attacker-uuid`).
2. On socket connect, sets `socket.auth = { userId: "victim-uuid" }` instead of their own ID.
3. Server joins `user:victim-uuid` room.
4. Attacker receives all download-ready events for the victim — including presigned ZIP URLs.
5. Attacker downloads the victim's files.

**Fix:**
```typescript
// Extract userId from verified JWT in socket handshake, not from client-supplied auth
import { verifyAccessToken } from "../modules/auth/utils/accessToken";

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// Then use socket.data.userId (server-verified) instead of handshake.auth.userId
socket.join(`user:${socket.data.userId}`);
```

---

### CRIT-03 — Session Revocation Not Enforced on 20+ Endpoints

**Location:** `backend/src/modules/auth/middlewares/authenticate.middleware.ts`

**Impact:** Revoked/stolen sessions remain valid on all endpoints except `GET /auth/me` for the full 15-minute JWT lifetime.

**Code:**
```typescript
// authenticate.middleware.ts — only verifies signature
const payload = verifyAccessToken(token);
(req as any).user = { userId: payload.userId, sessionId: payload.sessionId };
// No session validation here

// meController.ts — the ONLY endpoint that checks session state
await SessionService.validateSession(sessionId, userId);
```

**Affected endpoints (all unprotected by revocation):**
- All upload routes (`POST /uploads/presign`, `POST /uploads/complete`, `GET /uploads/:id/url`)
- All download routes (`POST /downloads/zip`, `GET /downloads/status/:jobId`)
- All calendar routes (CRUD + Google sync)
- All user/settings routes
- All service-area routes

**Exploit scenario:**
1. Admin notices a compromised account and calls `POST /auth/logout` → session is revoked in DB + Redis.
2. Attacker's stolen JWT is still valid for up to 15 minutes.
3. During those 15 minutes, attacker can still download files, create ZIP jobs, modify calendar events, change user settings — all routes are unaffected by revocation.

**Fix:**
Move session validation into `authenticate.middleware.ts` — not just `meController`:
```typescript
// authenticate.middleware.ts
const payload = verifyAccessToken(token);
const session = await SessionService.validateSession(payload.sessionId, payload.userId);
if (!session) throw new UnauthorizedError("Session revoked");
(req as AuthRequest).user = { userId: payload.userId, sessionId: payload.sessionId };
```
Keep the Redis cache (300s TTL) for performance — the 5-minute cache window is an acceptable trade-off if logout also explicitly invalidates Redis.

---

### CRIT-04 — Unauthenticated Dev Routes Mounted in Production

**Location:** `backend/src/routes/index.ts` + `backend/src/routes/dev.routes.ts`

**Impact:** Any internet user can enqueue unlimited ZIP jobs, flooding the worker queue and causing DoS.

**Code:**
```typescript
// routes/index.ts — no NODE_ENV guard
router.use("/dev", devRoutes);

// dev.routes.ts
router.post("/test-zip", async (req, res) => {
  // No authentication, no rate limiting
  await zipQueue.add("zip-job", { fileKeys: [...junk], userId: "dev-user", jobId: "dev-job" });
  res.json({ message: "ZIP job enqueued!" });
});
```

**Exploit scenario:**
1. Attacker POSTs to `POST /dev/test-zip` in a loop → thousands of jobs enqueued.
2. BullMQ worker processes each job: fetches from R2 (4 concurrent), creates ZIP, uploads result.
3. Worker CPU, R2 egress bandwidth, and Redis memory exhausted.
4. Legitimate users' ZIP jobs starve.
5. R2 egress costs spike.

**Fix:**
```typescript
// routes/index.ts
if (process.env.NODE_ENV !== "production") {
  router.use("/dev", devRoutes);
}
```
Additionally: remove or archive `dev.routes.ts` before launch; never merge unauthenticated mutation endpoints.

---

## 🟠 High-Risk Issues

---

### HIGH-01 — Google Calendar Webhook Token is the User's Public ID

**Location:** `backend/src/modules/google/googleCalendar.controller.ts:webhook`, `googleCalendar.sync.service.ts:createWatchChannel`

**Impact:** Anyone knowing a user's UUID can trigger unauthorized calendar syncs; Google's webhook security is defeated.

**Code:**
```typescript
// createWatchChannel
token: userId  // userId is NOT a secret; it appears in API responses

// webhook handler
if (channelToken !== integration.userId) return;  // "security" check is bypassable
```

**Fix:** Generate a per-integration random secret token, store it hashed in `GoogleCalendarIntegration`, and verify the webhook's `X-Goog-Channel-Token` against the hash.

---

### HIGH-02 — No Rate Limiting on Any Endpoint

**Location:** `backend/src/app.ts` — no rate limiting middleware present

**Impact:** Brute-force login, registration spam, password-reset email spam, ZIP queue flooding.

**Affected endpoints and risk:**

| Endpoint | Risk |
|---|---|
| `POST /auth/login` | Password brute force |
| `POST /auth/register` | Account creation spam + email bombing |
| `POST /auth/forgot-password` | Email bombing any address |
| `POST /uploads/presign` | Presigned URL harvesting |
| `POST /downloads/zip` | Queue flooding / R2 cost attack |

**Fix:** Add `rate-limiter-flexible` (Redis-backed) at minimum for auth endpoints:
```typescript
import { RateLimiterRedis } from "rate-limiter-flexible";
const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:login",
  points: 5, duration: 900,  // 5 attempts per 15 min per IP
  blockDuration: 900,
});
```

---

### HIGH-03 — `/uploads/complete` Trusts Client-Supplied Metadata

**Location:** `backend/src/modules/uploads/uploads.complete.controller.ts`

**Impact:** Users can record any `mimeType` and `size` in the DB regardless of what was actually uploaded. MIME-based access controls or billing based on size can be bypassed.

**The gap:**
- `/presign` validates `mimeType` and `size` against `UPLOAD_LIMITS`.
- `/complete` accepts `mimeType` and `size` from the request body and trusts them — there is no server-side re-validation or binding between the presigned URL and the completion payload.
- No `HeadObject` call on the R2 key to verify actual file existence and size.

**Fix:**
After upload, perform `HeadObject` on the key to retrieve actual `ContentLength` and `ContentType` from R2:
```typescript
const head = await storageService.headObject(key);
const actualSize = head.ContentLength;
const actualMimeType = head.ContentType;
// Validate against policy limits; store actuals in DB
```

---

### HIGH-04 — Google OAuth Account Linking Without User Consent

**Location:** `backend/src/modules/auth/controllers/googleLogin.controller.ts`

**Impact:** An attacker with a Google account matching a victim's email can silently link to and log in as the victim.

**Code flow:**
1. Victim has `alice@example.com` account (email/password login).
2. Attacker creates Google account with `alice@example.com` (if Google allows or email is not Google-verified at this point).
3. Attacker calls Google login with that token.
4. Backend finds existing user by email, creates GOOGLE `AuthIdentity`, links it, returns session.
5. Attacker now has full access to Alice's account.

**Additional bug:** `user.status` is never checked for Google logins — a suspended user can log in via Google.

**Fix:**
- Only link Google identity if the user is already authenticated (i.e., require existing email/password session to add Google as a login method).
- Otherwise, treat Google sign-in for an existing email account as a new distinct flow requiring email confirmation before linking.
- Always check `user.status` on any login path.

---

### HIGH-05 — Email Links Use Undefined Base URL

**Location:** `backend/src/modules/auth/services/email.service.ts`

**Impact:** All transactional emails (verify email, reset password, zip-ready notification) contain broken links with `undefined` as the domain. Core user flows are non-functional.

**Code:**
```typescript
const verifyUrl = `${process.env.FRONTEND_ORIGIN_use}/verify-email?token=${token}`;
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ not in .env, not in Zod schema → "undefined"
```

**Produced URL:** `undefined/verify-email?token=eyJ...`

**Fix:**
- Add `FRONTEND_ORIGIN` (already in Zod schema as an array) or a separate `FRONTEND_BASE_URL` string to the Zod env schema and use it in `email.service.ts`.
- `email.service.ts` should import from `config/env.ts`, not `process.env` directly.

---

### HIGH-06 — `testing` Upload Category Open to All Users (1 GB, `application/octet-stream`)

**Location:** `backend/src/modules/uploads/uploads.policy.ts`

**Impact:** Any authenticated user can presign a 1 GB upload of arbitrary binary content to production R2 storage.

**Code:**
```typescript
testing: {
  maxSizeBytes: 1024 * 1024 * 1024,  // 1 GB
  allowedMimeTypes: ["application/octet-stream"],
  prefix: "testing",
}
```

No admin gate. Any user can POST `{ category: "testing", ... }` to `/uploads/presign`.

**Fix:** Remove the `testing` category before launch, or gate it with an admin/role check middleware.

---

## 🟡 Medium / Design Issues

---

### MED-01 — `EMAIL_TOKEN_SECRET` Falls Back to `ACCESS_TOKEN_SECRET`

**Location:** `backend/src/modules/auth/utils/emailTokens.ts`

```typescript
const EMAIL_TOKEN_SECRET = process.env.EMAIL_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET!;
```

If `EMAIL_TOKEN_SECRET` is not set (it's absent from the Zod schema), email verification tokens and access tokens share the same signing key. An email token cannot be used as an access token (different structure), but key separation is a security best practice.

**Fix:** Add `EMAIL_TOKEN_SECRET` to the Zod env schema as required; remove the fallback.

---

### MED-02 — Email Verification Token in GET Query String

**Location:** `backend/src/modules/auth/controllers/verifyEmail.controller.ts`

```typescript
// GET /auth/verify-email?token=eyJhbGciOiJIUzI1NiJ9...
const { token } = req.query;
```

GET request query parameters are logged by: proxy servers, CDNs (Cloudflare logs), application server access logs, browser history, and `Referer` headers. Even though pino redacts `req.query.token` locally, any upstream proxy (nginx, Cloudflare) will log the full URL.

**Fix:** Use a short-lived opaque token (random hex, hashed in DB) — not a raw JWT — in the verification URL. Keep the JWT in the DB or derive the link token from the JWT hash.

---

### MED-03 — `authenticateMiddleware` Uses `(req as any).user` Cast

**Location:** `backend/src/modules/auth/middlewares/authenticate.middleware.ts` and all controllers

Every controller does `(req as any).user.userId` or `req.user?.userId`. TypeScript's type safety is bypassed throughout the auth layer. A middleware refactor that drops or renames the `user` property would be a silent runtime failure, not a compile-time error.

**Fix:** Use the existing `express.d.ts` `Request` extension properly:
```typescript
(req as AuthRequest).user = { userId, sessionId };
```
And type controllers with `AuthRequest` instead of `Request`.

---

### MED-04 — ZIP Worker: Silent File Skips with No User Feedback

**Location:** `backend/src/modules/downloads/workers/zip.worker.ts`

```typescript
if (err.name === "NoSuchKey") {
  console.warn(`[ZIP] File not found, skipping: ${key}`);
  continue;  // ZIP created without this file, user not notified
}
```

A user downloads a ZIP of 10 files. 3 are silently missing from R2. The ZIP succeeds, the user gets a file, and they may never notice the missing content.

**Fix:** Track skipped keys; include them in `DownloadJob.metadata` or a separate field; surface them in the status API response and UI.

---

### MED-05 — Two Avatar Presign Paths with Incompatible Key Formats

**Location:** `backend/src/modules/users/services/avatarPresign.services.ts` vs `backend/src/modules/uploads/uploads.service.ts`

- `POST /user/avatar/presign` → key: `avatars/${userId}/${uuid}.${ext}` (5 MB limit)
- `POST /uploads/presign?category=avatar` → key: `avatars/${userId}/original.${ext}` (2 MB limit)

The image worker only processes keys containing `"original"`. Avatars uploaded via the first path are never thumbnailed.

**Fix:** Consolidate to one presign path; standardize key format; remove the inconsistency.

---

### MED-06 — `getDownloadStatus` Does Not Validate `jobId` Format

**Location:** `backend/src/modules/downloads/controllers/getDownloadStatus.controller.ts`

`req.params.jobId` is passed directly to Prisma `findUnique` with `id: jobId`. If `jobId` is not a valid UUID (e.g., `../../../../etc/passwd`, an empty string, or 10,000 characters), Prisma will throw or return null. A `500` error instead of a `400` is returned on invalid input.

**Fix:**
```typescript
import { z } from "zod";
const { jobId } = z.object({ jobId: z.string().uuid() }).parse(req.params);
```

---

### MED-07 — TOCTOU in Calendar Update (Minor)

**Location:** `backend/src/modules/calendar/calendar.service.ts:updateEvent`

```typescript
// Step 1: check ownership
const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
if (!event) throw new NotFoundError();

// Step 2: update (scoped only to id, not userId)
await prisma.calendarEvent.update({ where: { id }, data: { ... } });
```

The `update` step doesn't re-scope to `userId`. In practice, event `id` is a UUID so collision is negligible — but the fix is trivially easy.

**Fix:**
```typescript
await prisma.calendarEvent.update({ where: { id, userId }, data: { ... } });
```

---

### MED-08 — Service Areas: `polygon: z.any()` with No Validation

**Location:** `backend/src/modules/service-areas/service-area.validators.ts`

```typescript
polygon: z.any().optional(),
```

Arbitrary data is accepted, passed to `normalizePolygon()` (which does minimal structural checks), then `JSON.stringify()`-ed and fed to PostGIS. Deeply nested objects or arrays with thousands of coordinates could cause CPU spikes in PostGIS.

**Fix:** Use a strict GeoJSON Polygon schema:
```typescript
polygon: z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).max(1000)
}).optional()
```

---

### MED-09 — `CHANGE_PASSWORD` Not in Audit Log

**Location:** `backend/src/modules/auth/controllers/changePassword.controller.ts` line 113

```typescript
// await audit.logAudit({ userId, event: "CHANGE_PASSWORD" });  // COMMENTED OUT
```

The `AuthEvent` enum is missing `CHANGE_PASSWORD`. Password changes leave no audit trail — a security incident investigation cannot determine when or how a password was changed.

**Fix:** Add `CHANGE_PASSWORD = "CHANGE_PASSWORD"` to the `AuthEvent` enum and uncomment the audit call.

---

### MED-10 — `createZip` Returns 404 on Ownership Violation

**Location:** `backend/src/modules/downloads/controllers/createZip.controller.ts`

```typescript
if (ownedUploads.length !== uniqueKeys.length) {
  return sendError(res, DOWNLOAD_CODES.DOWNLOAD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
}
```

When a user attempts to ZIP files they don't own, they receive a 404. This leaks the information that those keys exist (a true 404 would be indistinguishable from a non-existent key). A 403 is more appropriate for authorization failures.

---

### MED-11 — Google OAuth Tokens Stored in Plaintext

**Location:** `backend/prisma/schema.prisma` — `GoogleCalendarIntegration` model

```prisma
accessToken  String?
refreshToken String?
```

Google refresh tokens are long-lived credentials. If the database is breached, all Google Calendar integrations are compromised.

**Fix:** Encrypt with AES-256-GCM using a KMS-managed key (or at minimum an env-var-backed key) before storing; decrypt on read.

---

### MED-12 — `service-area.controller.ts` Uses `schema.parse()` (throws → 500)

**Location:** `backend/src/modules/service-areas/service-area.controller.ts`

```typescript
const body = createServiceAreaSchema.parse(req.body);  // throws ZodError
```

The global error middleware returns `500` for all unhandled exceptions, including Zod errors. Invalid service area input returns a generic 500 instead of a descriptive 400.

**Fix:** Use `safeParse()` throughout, or add a Zod-specific catch in the error middleware.

---

### MED-13 — `register.controller.ts` Sends Success Code on Error Path

**Location:** `backend/src/modules/auth/controllers/register.controller.ts` line 93

```typescript
// Error path incorrectly sends AUTH_CODES.USER_REGISTERED (a success code)
sendError(res, AUTH_CODES.USER_REGISTERED, HTTP_STATUS.CREATED);
```

On an unexpected error during registration, the API returns HTTP 201 with a "user registered" success code. The client has no way to distinguish success from failure.

---

### MED-14 — `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` Not in Zod Schema

**Location:** `backend/src/config/env.ts` + `backend/src/modules/auth/services/googleOAuth.service.ts`

```typescript
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);
// Non-null assertion — will be undefined if not set
```

If `GOOGLE_CLIENT_ID` is unset, `verifyIdToken()` receives `undefined` as the audience. The Google auth library's behavior with `undefined` audience is to skip audience validation — any Google ID token from any app would be accepted.

**Fix:** Add to Zod schema:
```typescript
GOOGLE_CLIENT_ID: z.string().min(1),
GOOGLE_CLIENT_SECRET: z.string().min(1),
```

---

### MED-15 — Debug `console.log` Left in Session Validation

**Location:** `backend/src/modules/auth/services/session.service.ts`

```typescript
console.log("[AUTH] Redis HIT", sessionId);
```

This logs on **every authenticated request** that hits the Redis cache (i.e., almost every request after the first). In production, this floods stdout with session IDs, creates I/O overhead, and leaks `sessionId` values to anyone with log access.

**Fix:** Replace with `logger.debug(...)` (already imported) and ensure debug level is disabled in production.

---

### MED-16 — `_dev/cleanup-multipart-uploads.ts` Aborts ALL In-Progress Uploads

**Location:** `backend/src/_dev/cleanup-multipart-uploads.ts`

This script aborts every incomplete multipart upload in the R2 bucket with no age filter, prefix filter, or dry-run mode. Running it during business hours would abort legitimate in-progress uploads.

**Fix:** Add `--dry-run` flag; filter by age (abort only uploads older than 24h); scope to a prefix.

---

## 🔵 Missing Production Features

| Feature | Priority | Notes |
|---|---|---|
| **Rate limiting** | P0 | No `express-rate-limit` or `rate-limiter-flexible` anywhere. Auth endpoints fully exposed to brute force. |
| **Socket authentication** | P0 | Currently uses unverified client-supplied userId (see CRIT-02) |
| **Session validation in middleware** | P0 | Revocation only enforced on 1 of 20+ protected routes (see CRIT-03) |
| **Request ID / Correlation tracing** | P1 | `request-id.middleware.ts` exists but is empty. No `X-Request-Id` header propagated. Zero traceability across distributed components. |
| **Structured error codes for Zod** | P1 | Zod validation errors return 500; need to be caught and returned as 400. |
| **Admin role middleware** | P1 | `AdminProfile` model and `UserRole` enum exist in Prisma schema but no admin-gated routes exist. |
| **Email link base URL** | P1 | `FRONTEND_ORIGIN_use` is undefined — all emails are broken (see HIGH-05) |
| **`CHANGE_PASSWORD` audit event** | P1 | Missing from `AuthEvent` enum (see MED-09) |
| **Webhook HMAC verification (Google)** | P1 | No cryptographic verification of Google webhook payload origin |
| **Encrypted OAuth token storage** | P2 | Google access/refresh tokens in plaintext DB |
| **Pagination** | P2 | `GET /uploads/` returns all user uploads with no limit. `GET /service-areas/` returns all service areas. No cursor/page/limit parameters. |
| **Soft-delete consistency** | P2 | `User` has `deletedAt` but most other models don't. Cascade delete behavior on User deletion is undefined for Sessions, Downloads, Uploads, CalendarEvents. |
| **Healthcheck depth** | P2 | `GET /health` returns `{ status: "ok" }` — does not check DB connectivity, Redis connectivity, or queue worker aliveness. |
| **Circuit breaker for R2/Redis** | P2 | No fallback when R2 or Redis is unavailable. R2 failures cause 500s; Redis unavailability breaks OAuth callback flow entirely. |
| **Worker process monitoring** | P2 | No heartbeat, no alerting if `image.worker.ts` or `zip.worker.ts` crashes silently. |
| **SMTP validation at startup** | P2 | SMTP credentials not in Zod schema; broken email config is not detected until first email send attempt. |
| **ZIP file count per user (concurrent)** | P3 | Comment says "max 3 active ZIP jobs" but code only uses a jobId uniqueness guard — no actual count limit. |
| **`testing` upload category removal** | P3 | 1 GB octet-stream uploads by any user (see HIGH-06) |
| **Dev route guard** | P0 | `NODE_ENV` check missing on dev route registration (see CRIT-04) |

---

## ⚙️ Scalability Assessment

### Current Architecture Limits

**Single-process bottlenecks:**
- `server.ts` runs Express HTTP, Socket.IO server, and Redis relay in the same process. Under load, the relay's Redis subscription competes with HTTP request handling on the Node.js event loop.
- No cluster mode — `server.worker.ts` exists but its relationship to `server.ts` is unclear. If they both bind on the same port, the app crashes.

**Redis connection proliferation:**
- Each worker process creates its own IORedis connection (zip worker, relay, image worker).
- With 4 concurrent zip workers + relay + HTTP process, expect 8–12 Redis connections minimum. Scales linearly with worker instances.

**ZIP streaming memory:**
- `archiver` streams to `PassThrough` piped to R2 multipart upload.
- Each ZIP job holds all 4 concurrent file streams in memory simultaneously.
- Max theoretical RSS per job: 4 × (R2 stream buffer) + archiver internal buffer ≈ 50–200 MB per job.
- With worker `concurrency: 4`, a single worker process could peak at ~800 MB RAM under max load.

**Database:**
- No indexes defined beyond Prisma defaults (PK + unique fields). Missing indexes on:
  - `Upload.ownerId` (filtered on every upload list + zip ownership check)
  - `Session.userId` (every session lookup)
  - `CalendarEvent.userId + startTime` (range queries)
  - `DownloadJob.userId` (ownership check)
  - `DownloadJob.status` (queue monitoring queries)
- `deleteAllEvents` on Calendar uses `deleteMany` with no `LIMIT` — unbounded DELETE on a large table blocks the table.

**Horizontal scaling blockers:**
- Socket.IO rooms are in-memory (no Redis adapter). Running two server instances means a socket event published to Redis is only emitted by the instance that has the subscriber — correct behavior. But the `getIO()` singleton would break if imported in worker processes on different machines.
- Session Redis cache keys use `session:${sessionId}` — any instance can read/write, so horizontal HTTP scaling works correctly with a shared Redis.

### Breaking Points

| Load | Expected Failure |
|---|---|
| 10 concurrent ZIP jobs | Worker OOM on a 1 GB container |
| 1,000 concurrent WebSocket connections | Single-process event loop saturation |
| 100k uploads per user | `GET /uploads/` response is megabytes, no pagination |
| DB with 10M calendar events | `deleteAllEvents` takes minutes, locks table |
| Redis down | Google OAuth callback fails; socket relay fails; session cache misses fall back to DB correctly |

---

## 🧪 Failure Mode Analysis

### Scenario 1: Worker crash mid-ZIP job

**What happens:**
- BullMQ moves the job to `failed` after `attempts` (default: 3) retries.
- Each retry starts from scratch — any partially uploaded multipart ZIP is abandoned (not aborted).
- Incomplete R2 multipart uploads accumulate, incurring storage charges indefinitely.
- User sees `FAILED` status in the UI with the raw exception message from `err.message`.
- No cleanup of the orphaned `zips/${jobId}/archive.zip` partial upload.

**Missing:** Abort multipart upload on job failure; limit retry to 1 (ZIP is idempotent, retrying from scratch is correct); clean up the R2 partial on final failure.

---

### Scenario 2: DB connection lost

**What happens:**
- Prisma throws `PrismaClientKnownRequestError` or `PrismaClientInitializationError`.
- Error middleware catches it and returns 500.
- No circuit breaker — every request hits the DB and fails for the duration of the outage.
- BullMQ workers continue processing — if they hit DB operations (updating job status, looking up user email), they throw and retry.
- Redis session cache is still valid but only for sessions already cached; new session lookups fail.

**Missing:** DB health check in `/health`; DB connection pool configuration; reconnect backoff.

---

### Scenario 3: Partial upload (client drops after presign, before complete)

**What happens:**
- R2 stores an orphaned object at `${prefix}/${userId}/${uuid}/original.${ext}`.
- No `UploadRecord` is created in the DB (only created at `/complete`).
- The R2 object is never referenced, never cleaned up.
- No TTL on presigned PUTs — the object stays in R2 forever.

**Missing:** R2 lifecycle rule to delete objects in the presign prefix not completed within 24h; a background job to reconcile DB records vs R2 objects.

---

### Scenario 4: Duplicate `POST /downloads/zip` request (network retry)

**What happens:**
- First request enqueues job `zip:userId:timestamp` and creates a `DownloadJob` DB record.
- Network timeout; client retries with the same `fileKeys`.
- Second request generates a new `timestamp` → new `jobId` → second job enqueued.
- Two ZIP jobs created for the same files; both complete; storage doubled; user sees two status records.

**Missing:** Client-side idempotency key; or server-side duplicate detection within a time window.

---

### Scenario 5: Redis down during active operations

**What happens:**
- `session.service.ts`: `validateSession` catches Redis error and falls back to DB lookup — ✅ correct.
- `googleCalendar.service.ts`: `redis.get(oauth:state:${state})` — no catch block. Redis failure during Google OAuth callback throws 500 — entire OAuth flow breaks. ❌
- `download.publisher.ts`: `redisClient.publish(...)` — if Redis is down, the ZIP completion event is never sent to the socket relay. User never receives the `download:complete` event. The frontend's 10-minute HTTP fallback poll will eventually pick it up. ⚠️ Degraded but not broken.
- `socket.relay.ts`: Redis subscription drops. Reconnect is handled by IORedis (retryStrategy). ⚠️ Brief window of missed events.

---

### Scenario 6: Malicious user behavior

| Attack | Current state |
|---|---|
| Brute-force login | ❌ No rate limiting — try unlimited passwords |
| Register-spam + email bomb any address | ❌ No rate limiting on register/forgot-password |
| ZIP queue flood via `/dev/test-zip` | ❌ Unauthenticated endpoint, no rate limit |
| Steal another user's download via socket | ❌ Socket auth bypass (CRIT-02) |
| Force-link Google account to victim email | ❌ No consent flow (HIGH-04) |
| Download victim's files via socket hijack | ❌ Combines CRIT-02 + CRIT-03 |
| Upload 1 GB binary file | ❌ `testing` category allows it (HIGH-06) |
| Access another user's ZIP by polling status | ✅ Ownership check in `getDownloadStatus` |
| Enumerate valid user emails via timing | ⚠️ Partially mitigated by uniform error responses; bcrypt timing still differs for nonexistent users |

---

## 🧰 Utilities Audit

| Utility | Location | Verdict |
|---|---|---|
| `accessToken.ts` | `modules/auth/utils/` | ✅ Solid — HS256, 15-min expiry, `iss`/`aud` |
| `refreshToken.ts` | `modules/auth/utils/` | ✅ Solid — HMAC-SHA256, `timingSafeEqual` |
| `tokenHash.ts` | `modules/auth/utils/` | ✅ Solid — constant-time compare |
| `emailTokens.ts` | `modules/auth/utils/` | ⚠️ Risky — falls back to `ACCESS_TOKEN_SECRET`; `hashEmailToken` is SHA-256 not HMAC |
| `storage.service.ts` | `infra/storage/` | ✅ Solid — ContentLength in presign, streaming multipart; checksum disabled (R2 compat) |
| `download.publisher.ts` | `infra/socket/` | ⚠️ No error handling on Redis publish failure |
| `socket.relay.ts` | `infra/socket/` | ⚠️ No schema validation on Redis event payload |
| `redis.ts` | `infra/` | ⚠️ Falls back to `127.0.0.1` bypassing Zod-validated env |
| `extractExtension` | `uploads.service.ts` | ✅ Safe — used in R2 keys, not filesystem paths |
| `normalizePolygon` | `service-area.service.ts` | ⚠️ Weak — called on `z.any()` input |
| `_dev/cleanup-multipart-uploads.ts` | `_dev/` | 🔴 Dangerous — no dry-run, no age filter, deletes ALL multipart uploads |
| `session.service.ts` | `modules/auth/services/` | ⚠️ Redis TTL mismatch — 5-min positive cache but revocation is application-level |

---

## 🧱 Architecture Verdict

**Is this production-grade? No.**

**Strengths:**
- Clean module separation (`modules/`, `infra/`, `config/`) — the intended architecture is well-structured.
- Prisma schema is comprehensive and well-modeled.
- BullMQ + worker pattern is architecturally correct for async jobs.
- Zod-first validation in most controllers.
- Refresh token rotation with replay detection is correctly implemented.

**Structural weaknesses preventing production readiness:**

1. **Authentication is incomplete.** The middleware verifies tokens but doesn't enforce revocation. Session management is correct in code but not wired into the request pipeline.

2. **Real-time infrastructure is insecure by design.** Socket.IO accepts arbitrary user identity from the client. This is a fundamental architectural gap, not a small fix.

3. **Configuration management is inconsistent.** The Zod env schema (`config/env.ts`) is the right pattern, but 6+ env vars are read directly from `process.env` elsewhere, bypassing validation. The `.env` file is inside `src/`, committed to git.

4. **Error handling is inconsistent.** Mix of `.parse()` (throws 500) and `.safeParse()` (returns 400) across controllers. No standardized error type hierarchy.

5. **No operational safety nets.** No rate limiting, no request IDs, no healthcheck depth, no circuit breakers, no worker monitoring, no orphaned-upload cleanup.

---

## 🗺️ Action Plan (PRIORITIZED)

### Phase 1 — Stop the Bleeding (Before any deployment)

1. **Rotate all secrets** — R2 keys, SMTP password, JWT secrets. Remove `backend/src/infra/storage/.env` from git history.
2. **Fix socket auth** (CRIT-02) — verify `userId` from JWT in socket handshake, not from client `auth`.
3. **Guard dev routes** (CRIT-04) — wrap in `if (process.env.NODE_ENV !== 'production')`.
4. **Fix email base URL** (HIGH-05) — add `FRONTEND_BASE_URL` to Zod schema; use it in `email.service.ts`.
5. **Remove `testing` upload category** (HIGH-06) — or gate it behind admin middleware.

### Phase 2 — Security Hardening (Week 1)

6. **Add session validation to `authenticate.middleware.ts`** (CRIT-03) — call `validateSession()` in middleware, not just in `meController`.
7. **Add rate limiting** (HIGH-02) — `rate-limiter-flexible` on login, register, forgot-password, presign, zip-create.
8. **Fix Google OAuth account linking** (HIGH-04) — require existing session to link Google identity; add `user.status` check.
9. **Fix Google webhook token** (HIGH-01) — generate random secret per integration, hash it, verify webhook against hash.
10. **Add `CHANGE_PASSWORD` to `AuthEvent` enum** (MED-09) — uncomment the audit log call.
11. **Add `GOOGLE_CLIENT_ID/SECRET` to Zod schema** (MED-14) — remove non-null assertion fallback.

### Phase 3 — Data Integrity and Design Fixes (Week 2)

12. **Validate `jobId` as UUID in status endpoint** (MED-06).
13. **Perform `HeadObject` at `/uploads/complete`** (HIGH-03) — validate actual size/MIME against policy.
14. **Consolidate avatar presign paths** (MED-05) — one path, consistent key format.
15. **Fix `service-area.controller.ts`** (MED-12) — use `safeParse()`, return 400 for Zod errors.
16. **Fix `register.controller.ts` error path** (MED-13) — send correct error code on catch.
17. **Fix TOCTOU in calendar update** (MED-07) — scope `update` to `{ id, userId }`.
18. **Add polygon validation schema** (MED-08) — replace `z.any()` with typed GeoJSON schema.

### Phase 4 — Operational Readiness (Week 3)

19. **Request ID middleware** — implement `request-id.middleware.ts`; propagate to all log entries and responses.
20. **Pagination** — add `limit`/`cursor` to `GET /uploads/`, `GET /service-areas/`.
21. **Database indexes** — add indexes on `Upload.ownerId`, `Session.userId`, `CalendarEvent.userId`, `DownloadJob.userId`, `DownloadJob.status`.
22. **Healthcheck depth** — `GET /health` should check DB ping, Redis ping, queue worker aliveness.
23. **ZIP failure cleanup** — abort in-progress multipart upload on BullMQ job final failure.
24. **Orphaned upload cleanup** — R2 lifecycle rule + `_dev/cleanup-multipart-uploads.ts` fix (age filter + dry-run).
25. **Encrypt Google OAuth tokens at rest** — AES-256-GCM before DB insert.
26. **Fix Redis failure in Google OAuth callback** — wrap `redis.get(oauth:state:...)` in try/catch with graceful error response.
27. **Add SMTP env to Zod schema** — fail fast on startup if SMTP is misconfigured.

### Final Production Checklist

- [ ] All secrets rotated and `.env` removed from git history
- [ ] Socket auth verifies JWT server-side
- [ ] Rate limiting on all auth + resource-creation endpoints
- [ ] Session revocation enforced in `authenticate.middleware.ts`
- [ ] Dev routes gated by `NODE_ENV`
- [ ] Email links use correct base URL
- [ ] `testing` upload category removed
- [ ] `GOOGLE_CLIENT_ID/SECRET` in Zod schema
- [ ] `CHANGE_PASSWORD` audited
- [ ] Google webhook uses HMAC secret, not userId
- [ ] Database indexes added
- [ ] Request ID tracing implemented
- [ ] Health check covers DB + Redis
- [ ] Pagination on all list endpoints
- [ ] ZIP job failure cleanup implemented
- [ ] Load test: 50 concurrent ZIP jobs, 500 concurrent WebSocket connections
