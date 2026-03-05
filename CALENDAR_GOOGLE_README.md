# Calendar & Google Calendar Integration — How It Works

This document explains every file involved in the calendar feature, how
Local→Google sync works, how Google→Local sync is supposed to work, and
**why real-time Google→Local updates are currently broken** and what it
would take to fix them.

---

## File Map

```
backend/src/
├── modules/
│   ├── calendar/
│   │   ├── calendar.service.ts       Local CRUD (create/update/delete/getAll)
│   │   ├── calendar.controller.ts    HTTP handlers for /events routes
│   │   ├── calendar.routes.ts        Route definitions for /events
│   │   ├── calendar.types.ts         TypeScript types for event input
│   │   └── calendar.codes.ts         App-level response codes (21xxx / 44xxx)
│   │
│   └── google/
│       ├── googleCalendar.service.ts     OAuth flow, getStatus, import, export
│       ├── googleCalendar.sync.service.ts  All bidirectional sync logic
│       ├── googleCalendar.controller.ts  HTTP handlers for /google routes
│       ├── googleCalendar.routes.ts      Route definitions for /google
│       └── googleCalendar.worker.ts      Cron job — renews expiring webhook channels

frontend/src/
├── features/
│   ├── users/calendarApi.ts          RTK Query slice for /events endpoints
│   └── google/googleCalendarApi.ts   RTK Query slice for /google endpoints
│
└── pages/Calendar.tsx                The calendar UI page
```

---

## Route Table

| Method | Path | Auth | What it does |
|--------|------|------|--------------|
| GET | /events | ✅ | Fetch all events for logged-in user |
| POST | /events | ✅ | Create event locally + push to Google if sync on |
| PUT | /events/:id | ✅ | Update event locally + push to Google if sync on |
| DELETE | /events/all | ✅ | Delete all local events for user |
| DELETE | /events/:id | ✅ | Delete one event locally + delete from Google if sync on |
| GET | /google/connect | ✅ | Generate Google OAuth URL |
| GET | /google/callback | ❌ public | Handle OAuth redirect from Google |
| GET | /google/status | ✅ | Return { connected, email, isSyncEnabled } |
| POST | /google/sync/toggle | ✅ | Enable or disable bidirectional sync |
| POST | /google/import | ✅ | One-time pull from Google with optional date range |
| POST | /google/export | ✅ | One-time push to Google with optional date range |
| POST | /google/webhook | ❌ public | Receives push notifications from Google |

---

## Part 1 — Local Calendar (No Google)

### How CRUD works

**Create** (`POST /events`)
```
Request → CalendarController.createEvent
        → CalendarService.createEvent
            → prisma.calendarEvent.create   (saves to DB)
            → GoogleCalendarSyncService.pushLocalEvent(eventId)  [if sync on]
        → returns saved event
```

**Update** (`PUT /events/:id`)
```
Same as create but calls prisma.calendarEvent.update
then GoogleCalendarSyncService.pushLocalEvent(eventId)
```

**Delete** (`DELETE /events/:id`)
```
→ CalendarService.deleteEvent
    → GoogleCalendarSyncService.deleteLocalEventFromGoogle(...)  [if sync on]
    → prisma.calendarEvent.delete
    → emit "calendar:updated" via Socket.IO   ← fires AFTER DB delete
```

> **Important ordering note:** The socket emit fires AFTER the local DB
> delete. This matters. An earlier bug had it firing before the delete,
> which caused the frontend to refetch and still see the event — making
> delete appear broken.

**Get all** (`GET /events`)
```
→ CalendarService.getUserEvents
    → prisma.calendarEvent.findMany({ where: { userId }, orderBy: startAt })
```

### Real-time updates on the frontend

The frontend (`Calendar.tsx`) connects to Socket.IO on mount:

```ts
socket.on("calendar:updated", () => {
  refetch();   // re-runs GET /events
});
```

Every operation that changes data emits `"calendar:updated"` on the
`user:{userId}` Socket.IO room. The frontend hears it and refetches.

---

## Part 2 — Connecting Google (OAuth)

### Step-by-step OAuth flow

1. User clicks "Connect Google" in the UI
2. Frontend calls `GET /google/connect`
3. Backend generates a Google OAuth URL with `state = userId`
   (scopes: `calendar` + `userinfo.email`)
4. Frontend redirects the browser to that URL
5. User approves in Google's consent screen
6. Google redirects to `GET /google/callback?code=...&state=userId`
7. Backend exchanges `code` for tokens (access + refresh)
8. Backend fetches the user's Google email via `oauth2.userinfo.get()`
9. Backend upserts a `GoogleCalendarIntegration` row:
   - `userId`, `email`, `accessToken`, `refreshToken`, `expiryDate`
10. Google redirects browser to `{FRONTEND_URL}/calendar?google=connected`

### Token refresh

`googleCalendar.service.ts → getAuthorizedClient()` attaches a `"tokens"`
listener to the OAuth2 client. When the access token expires, the Google
client library automatically refreshes it using the refresh token and fires
this event, which updates `accessToken` and `expiryDate` in the DB.

---

## Part 3 — Local → Google Sync (THIS WORKS ✅)

When sync is enabled, every create/update/delete locally triggers a
**direct Google Calendar API call**. No webhooks involved.

### pushLocalEvent (create or update)

```
CalendarService.createEvent / updateEvent
  → GoogleCalendarSyncService.pushLocalEvent(eventId)
      → read event from DB
      → LOOP GUARD: if lastModifiedSource === GOOGLE, return immediately
                    (prevents echo: Google told us → we saved → we push back → infinite loop)
      → check integration.isSyncEnabled, return if false
      → build Google event resource (title, start, end, timezone)
      → if event already has googleEventId:
            calendar.events.update(...)
            if 404: clear googleEventId, fall through to insert
      → if no googleEventId:
            calendar.events.insert(...)
      → update local row with googleEventId, googleEtag, googleHtmlLink
      → emit "calendar:updated" socket event
```

### deleteLocalEventFromGoogle

```
CalendarService.deleteEvent
  → GoogleCalendarSyncService.deleteLocalEventFromGoogle(id, userId, googleEventId)
      → check isSyncEnabled
      → calendar.events.delete(googleEventId)
      → 404/410 errors are silently ignored (already deleted on Google side)
  → prisma.calendarEvent.delete(id)
  → emit "calendar:updated"
```

---

## Part 4 — Google → Local Sync (PARTIALLY BROKEN ⚠️)

This direction has two mechanisms: **webhooks** (real-time) and **sync tokens**
(incremental). Both are implemented. Only one is currently working.

### Mechanism A — Google Push Webhooks (BROKEN in current setup)

Google push webhooks work like this:

```
User edits event in Google Calendar
        ↓
Google sends POST to GOOGLE_WEBHOOK_URL
        ↓
GoogleCalendarController.webhook()
        ↓
Looks up integration by webhookChannelId + webhookResourceId
        ↓
GoogleCalendarSyncService.pullRemoteChanges(userId)
        ↓
Fetches changes from Google using syncToken
        ↓
Upserts/deletes events locally
        ↓
Emits "calendar:updated" → frontend refetches
```

**Why this is broken right now:**

Your `.env` has:
```
GOOGLE_WEBHOOK_URL=http://192.168.1.18:4000/google/webhook/
```

Two problems with this:

1. `192.168.1.18` is a **private LAN IP**. Google's servers are on the
   internet. They cannot reach a device inside your local network.
   This request never arrives at your server.

2. Google requires the webhook URL to be **HTTPS**. Plain HTTP is rejected
   when registering the watch channel.

Because Google's POST notifications never arrive, `pullRemoteChanges` is
never called, and nothing from Google ever appears locally in real time.

**How to fix it (when you're ready):**

```bash
# Install ngrok
ngrok http 4000
# You get something like: https://abc123.ngrok-free.app
```

Update `.env`:
```
GOOGLE_WEBHOOK_URL=https://abc123.ngrok-free.app/google/webhook
```

Then in the UI: **Disable Sync → Enable Sync**. This registers a new watch
channel with Google using the correct public HTTPS URL. From that point,
Google → Local will work in real time.

> **Note:** ngrok's free tier gives you a new URL every restart, so you'd
> need to update the env and re-register the channel each time. For a
> stable dev setup, use a paid ngrok plan, Cloudflare Tunnel, or deploy
> to a server with a fixed public URL.

### Mechanism B — Sync Token (incremental pull, used when webhook fires)

`pullRemoteChanges` uses the Google Calendar incremental sync API:

1. On first call (no `syncToken` in DB), calls `fullInitialSync`:
   - Lists ALL events from Google Calendar
   - Upserts each one locally
   - Saves `nextSyncToken` from the last page to DB

2. On subsequent calls (has `syncToken`):
   - Calls `calendar.events.list({ syncToken })` — returns ONLY events
     changed since last sync
   - Processes each change:
     - `status === 'cancelled'` → `deleteMany` locally
     - otherwise → `upsertGoogleEventToLocal`
   - Saves new `syncToken`
   - If `410 Gone` (token expired) → clears token, falls back to `fullInitialSync`

The sync token approach means even if the webhook fires late or is missed,
the next call to `pullRemoteChanges` catches up from the last known state.

### Loop prevention in upsertGoogleEventToLocal

When a local event is pushed to Google and Google sends a webhook back
(echo), we don't want to re-import the same event. Two mechanisms prevent this:

**1. `lastModifiedSource` field**
- When we push to Google: `lastModifiedSource` stays as `LOCAL`
- When Google pushes to us: we set `lastModifiedSource = GOOGLE`
- In `pushLocalEvent`: `if (lastModifiedSource === GOOGLE) return` — stops
  us from pushing back what Google just sent

**2. Timestamp comparison in `upsertGoogleEventToLocal`**
```ts
if (existing.updatedAt > googleUpdated) {
  return; // local is newer, skip this echo
}
```
If our local `updatedAt` is newer than Google's `updated` timestamp, we
assume this is an echo of something we already have and skip it.

---

## Part 5 — Enabling / Disabling Sync

### Enable sync (`toggleSync(userId, true)`)

```
1. Set isSyncEnabled = true in DB
2. fullInitialSync(userId)
      → pull ALL events from Google → upsert locally → save syncToken
3. createWatchChannel(userId)
      → call calendar.events.watch({ address: GOOGLE_WEBHOOK_URL })
      → Google returns channelId, resourceId, expiration (~7 days)
      → save all three to DB
```

### Disable sync (`toggleSync(userId, false)`)

```
1. stopWatchChannel(userId)
      → call calendar.channels.stop({ id, resourceId })
      → Google stops sending webhook notifications
      → clear webhookChannelId, webhookResourceId, webhookExpiration in DB
2. Set isSyncEnabled = false in DB
```

---

## Part 6 — Import / Export (Manual, No Sync Required)

These work without sync being enabled. They are one-off operations.

### Import (`POST /google/import`)

Pulls events from Google Calendar into the local DB.
Accepts optional `startDate` / `endDate` in request body.
Uses `calendar.events.list({ timeMin, timeMax })`.
Same upsert logic as sync — does not overwrite newer local events.

### Export (`POST /google/export`)

Pushes local events that have **no `googleEventId`** (never been sent to
Google) to Google Calendar.
Accepts optional `startDate` / `endDate` to filter by `startAt` / `endAt`.
After each successful insert, saves the returned `googleEventId` locally.

---

## Part 7 — Webhook Channel Renewal (Worker)

Google webhook channels expire after ~7 days. The worker in
`googleCalendar.worker.ts` runs every 6 hours:

```
cron: "0 */6 * * *"
  → find all integrations where:
      isSyncEnabled = true
      webhookChannelId is not null
      webhookExpiration < (now + 1 hour)   ← expiring within 1 hour
  → for each: renewWatchChannel(userId)
      → stopWatchChannel (tell Google to stop the old one)
      → createWatchChannel (register a new one, save new IDs to DB)
```

This means channels are renewed proactively before they expire.

> **Currently:** The worker runs but the channels it renews still point to
> `http://192.168.1.18:4000` which Google can't reach. So renewal is
> happening correctly in terms of code, but the channels themselves are
> useless until the URL is fixed.

---

## Summary: What's Working vs What's Not

| Feature | Status | Why |
|---------|--------|-----|
| Local create/update/delete | ✅ Working | Direct DB operations |
| Local → Google (create) | ✅ Working | Direct Google API call |
| Local → Google (update) | ✅ Working | Direct Google API call |
| Local → Google (delete) | ✅ Working | Direct Google API call |
| Google → Local (real-time) | ❌ Broken | Webhook URL is LAN IP, Google can't reach it |
| Google → Local (delete) | ❌ Broken | Same — depends on webhook |
| One-time Import | ✅ Working | Direct API call, no webhook needed |
| One-time Export | ✅ Working | Direct API call, no webhook needed |
| Sync token tracking | ✅ Working | Saves correctly, used when webhook fires |
| Channel renewal worker | ✅ Code works | But channels are useless without public URL |
| Socket.IO real-time UI | ✅ Working | Frontend updates on every local change |

---

## What Needs to Happen to Make Everything Work

1. **Get a public HTTPS URL** for your backend
   - Development: `ngrok http 4000` → gives `https://xxx.ngrok-free.app`
   - Production: deploy backend to any server with a domain + SSL

2. **Update `.env`**
   ```
   GOOGLE_WEBHOOK_URL=https://your-public-url.com/google/webhook
   ```

3. **Re-register the webhook channel**
   - In the UI: Disable Sync → Enable Sync
   - This runs `createWatchChannel` with the new URL

4. **Done** — Google → Local sync will work in real time after this

---

## Database Fields Reference (GoogleCalendarIntegration)

| Field | Purpose |
|-------|---------|
| `userId` | Links to the user |
| `email` | Google account email |
| `accessToken` | Current Google OAuth access token |
| `refreshToken` | Long-lived token to get new access tokens |
| `expiryDate` | When the current access token expires (BigInt ms) |
| `isSyncEnabled` | Whether bidirectional sync is active |
| `syncToken` | Google's incremental sync token (null = full sync needed) |
| `webhookChannelId` | UUID we gave to Google when registering the watch channel |
| `webhookResourceId` | ID Google gave us for the channel |
| `webhookExpiration` | When the channel expires (BigInt ms from epoch) |

## Database Fields Reference (CalendarEvent)

| Field | Purpose |
|-------|---------|
| `userId` | Owner |
| `googleEventId` | Google Calendar event ID (null = not synced to Google) |
| `googleEtag` | Google's ETag for the event (used for caching/conflict) |
| `googleHtmlLink` | Link to the event in Google Calendar UI |
| `lastModifiedSource` | `LOCAL` or `GOOGLE` — used for loop prevention |
| `lastSyncedAt` | When this event was last synced with Google |
| `allDay` | Whether it's an all-day event |
| `timeZone` | IANA timezone string (e.g. "Asia/Kolkata") |
