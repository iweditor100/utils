# Annotations Feature — Implementation Roadmap

## Current State

### What exists today

**Frontend (`frontend/src/features/annotations/`)**
- 10 drawing tools: select, freedraw, rect, ellipse, line, dottedline, text, pin, polygon, eraser
- Color picker: 8 presets + custom `<input type="color">`
- Stroke width slider (1–20 px)
- Undo / Redo — in-memory history stack
- Manual save (only enabled when dirty)
- Clear all canvas, Delete selected object(s)
- Download composited PNG (canvas overlaid on base image)
- Keyboard: `Ctrl+Z` undo, `Ctrl+Y` / `Ctrl+Shift+Z` redo
- Normalized coordinate storage (0–1 range) so annotations survive image resize
- Polygon with rubber-band preview + snap-to-close
- ResizeObserver keeps canvas in sync with container
- Dark mode throughout

**Backend (`backend/src/modules/annotations/`)**
- `POST /annotations` — Zod-validated upsert, returns `{ id, version }`
- `GET /annotations/:uploadId` — ownership-checked fetch
- Version counter increments on every save
- Max 500 objects enforced
- Custom error types + structured response codes
- Prisma + PostgreSQL (`Json` field for annotation data)

### Known bugs (fix before new features)

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | JPEG-only blocks PNG/WebP | `annotations.service.ts:9` | Add `image/png`, `image/webp` to `ALLOWED_MIME_TYPES` |
| 2 | Undo history resets after every save | `AnnotationCanvas.tsx:42-46` | Don't call `deserialize` on refetch after save — see Sprint 1 |
| 3 | Canvas resize doesn't reflow objects | `useFabricCanvas.ts:255` | Re-paint from `serialize()` snapshot after each resize event |
| 4 | Text tool stays in edit mode on tool switch | `useFabricCanvas.ts:271` | Call `(o as IText).exitEditing()` in tool-switch cleanup |
| 5 | Delete/Backspace key not wired | `AnnotationCanvas.tsx:57` | Add `e.key === "Delete"` branch to existing `keydown` handler |
| 6 | Stroke width irrelevant for text / pin | `AnnotationToolbar.tsx` | Hide slider and show font-size input when tool is `text`; hide for `pin` |
| 7 | No unsaved-changes guard | `AnnotationCanvas.tsx` | Add `beforeunload` listener when `isDirty === true` |
| 8 | No confirmation before Clear All | `AnnotationToolbar.tsx` | Inline two-step confirm or `window.confirm` |

---

## Sprint 1 — Stability & Core UX

> Goal: make what exists solid and trustworthy before adding anything new.

### 1.1 Fix all bugs listed above

No new dependencies. All changes are in existing files. Estimated ~2–3 hours total.

### 1.2 Auto-save with debounce

**Why:** Users shouldn't have to remember to save. Silent auto-save with a status indicator is the baseline expectation.

**Implementation:**

```
useAnnotationState.ts
  └─ add useDebouncedSave(annotationData, delay = 2000)
       - on every markDirty call, restart a 2s timer
       - on timer fire, call save(serialize())
       - expose: lastSavedAt: Date | null, autoSaveStatus: "idle" | "saving" | "saved" | "error"

AnnotationCanvas.tsx
  └─ pass serialize to useAnnotationState so it can call it on the timer
  └─ show "Auto-saved just now" in the status bar

AnnotationToolbar.tsx
  └─ Save button becomes "Force Save" or shows last-saved timestamp
```

No new packages needed.

### 1.3 Preserve undo history after save

**Why:** Currently `saveAnnotation` invalidates the RTK tag → refetch → `deserialize` resets the history stack.

**Implementation:**

```
useAnnotationState.ts
  └─ add isSaveRefetch: boolean flag
       - set true before calling saveAnnotation
       - set false after the refetch resolves

AnnotationCanvas.tsx  (deserialize useEffect)
  └─ if (imageLoaded && savedData && !isSaveRefetch) deserialize(savedData)
       - only deserialize on initial load, not after a save-triggered refetch
```

### 1.4 Toast notifications

**Why:** Silent save state (button color only) is easy to miss. Users need feedback.

**Implementation:**

Install `react-hot-toast` (tiny, zero-config).

```
AnnotationCanvas.tsx
  └─ toast.success("Saved") on save success
  └─ toast.error("Failed to save — check connection") on error
  └─ replace the "Failed to load annotations" span with toast.error(...)
```

```bash
npm install react-hot-toast   # frontend only
```

Add `<Toaster />` to `App.tsx` root.

---

## Sprint 2 — Drawing Power Tools

> Goal: bring the toolset to parity with tools like Figma comments, Loom, or Marker.io.

### 2.1 Arrow tool

**Why:** The single most-requested annotation shape. A directed arrow communicates "this → that" which no existing tool does.

**Implementation:**

```
types.ts (frontend + backend)
  └─ add ArrowAnnotation: { id, type:"arrow", x1,y1,x2,y2, color, strokeWidth }

annotationObjectSchema (backend)
  └─ add "arrow" discriminated union variant (same shape as "line")

useFabricCanvas.ts
  └─ in tool === "arrow" block:
       - draw a Line from (x1,y1) to (x2,y2)  ← same as existing line tool
       - on mouse:up, compute angle of line
       - create a Triangle (arrowhead) positioned at (x2,y2), rotated to match angle
       - group Line + Triangle together with fabric.Group
       - tag group with annotationId + annotationType = "arrow"

  └─ in serialize(): handle group type:
       - extract line coords + arrowhead position from group children

  └─ in paintCanvas(): reconstruct Group from ArrowAnnotation data

AnnotationToolbar.tsx
  └─ add Arrow entry to TOOLS array with an arrow SVG icon
```

No new packages needed.

### 2.2 Zoom + Pan

**Why:** Annotating fine detail on large images is impossible without zoom.

**Implementation:**

```
useFabricCanvas.ts
  └─ add useZoom() section:
       - wheel event: canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom)
       - clamp zoom between 0.2x and 10x
       - expose: zoom: number, resetZoom: () => void

  └─ pan: when tool === "select" and space is held (or middle-mouse-drag):
       - canvas.relativePan(new Point(dx, dy))

AnnotationCanvas.tsx
  └─ pass zoom + resetZoom from useFabricCanvas
  └─ show zoom % in the status bar ("Canvas · rect · 150%")
  └─ add "Reset zoom" button (appears only when zoom !== 1)
```

No new packages needed (Fabric has `zoomToPoint` and `relativePan` built in).

### 2.3 Opacity control

**Why:** Highlights and overlays need transparency. Currently impossible.

**Implementation:**

```
types.ts
  └─ add optional opacity?: number (0–1) to all AnnotationObject variants

useFabricCanvas.ts
  └─ apply obj.opacity when constructing each Fabric object
  └─ read obj.opacity in serialize()

AnnotationToolbar.tsx
  └─ add Opacity slider (0%–100%) below Stroke slider
  └─ hide opacity slider for "pin" and "text" (opacity on those is weird UX)

useFabricCanvas hook signature
  └─ add opacity: number param (default 1)
```

### 2.4 Filled shapes

**Why:** A filled highlight rect is more readable than a stroke-only rect for emphasis.

**Implementation:**

```
types.ts
  └─ add fillColor?: string to RectAnnotation, CircleAnnotation, PolygonAnnotation

AnnotationToolbar.tsx
  └─ add "Fill" color swatch (second color picker, labeled "Fill")
  └─ show only when tool is rect / circle / polygon

useFabricCanvas.ts
  └─ pass fillColor prop when constructing rect/circle/polygon
  └─ read fill in serialize() for those shapes
```

### 2.5 Numbered callouts (pins with labels)

**Why:** Step-by-step annotations like "1. Click here → 2. Then this" require numbered markers.

**Implementation:**

```
types.ts
  └─ extend PinAnnotation: add label?: string, number?: number

useFabricCanvas.ts
  └─ in tool === "pin" block: auto-increment a counter ref
  └─ create a Group(Circle + IText) where IText shows the number
  └─ in serialize(): extract number + position from group
  └─ in paintCanvas(): reconstruct labeled pin group

AnnotationToolbar.tsx
  └─ add "Callout" as a separate tool next to "Pin"
  └─ show counter reset button when callout tool active
```

### 2.6 Copy / Paste / Duplicate

**Why:** Expected in every drawing tool. Saves time repeating similar annotations.

**Implementation:**

```
useFabricCanvas.ts
  └─ add clipboard: useRef<fabric.Object | null>(null)
  └─ in the keydown handler (AnnotationCanvas.tsx):
       Ctrl+C → canvas.getActiveObject() → store serialized copy in clipboardRef
       Ctrl+V → deserialize from clipboardRef, offset by (10, 10), add to canvas
       Ctrl+D → copy + paste in one action
```

---

## Sprint 3 — Object Management & Layers

> Goal: give users control over what's on the canvas, not just the ability to draw.

### 3.1 Object properties panel (context-sensitive toolbar)

**Why:** When an object is selected, the user should be able to edit its color/stroke inline — not have to deselect, change the global color, and redraw.

**Implementation:**

```
useFabricCanvas.ts
  └─ add selectedObject state: AnnotationObject | null
  └─ listen to canvas.on("selection:created") + ("selection:updated") + ("selection:cleared")
  └─ serialize selected object on each event and expose it

AnnotationCanvas.tsx
  └─ pass selectedObject to AnnotationToolbar
  └─ pass onUpdateSelected(patch: Partial<AnnotationObject>) callback

AnnotationToolbar.tsx
  └─ when selectedObject !== null, show "Selected Object" section at top
  └─ show color, stroke, opacity fields pre-filled from selectedObject
  └─ on change, call onUpdateSelected which applies patch via canvas.getActiveObject().set({...})
```

### 3.2 Layers panel

**Why:** When many annotations overlap, users need to navigate them without clicking through the canvas.

**Implementation:**

```
useFabricCanvas.ts
  └─ expose objectList: AnnotationObject[] (re-computed on each canvas change)
  └─ expose selectById(id: string), hideById(id: string), deleteById(id: string)
  └─ expose moveUp(id), moveDown(id) for z-order control

New component: AnnotationLayers.tsx
  └─ collapsible panel (below or replacing part of toolbar)
  └─ scrollable list showing type icon + color swatch + short label per object
  └─ click to select, eye icon to toggle visibility, trash icon to delete
  └─ drag handle for reordering (use @dnd-kit/sortable)

AnnotationCanvas.tsx / AnnotationToolbar.tsx
  └─ integrate AnnotationLayers into the right panel
```

```bash
npm install @dnd-kit/core @dnd-kit/sortable   # frontend
```

### 3.3 Object lock

**Why:** Prevents accidentally moving a reference annotation while drawing new ones.

**Implementation:**

```
useFabricCanvas.ts
  └─ add lockedIds: Set<string> ref
  └─ expose toggleLock(id: string)
  └─ on canvas:render, apply lockMovementX/Y + hasControls=false to locked objects

AnnotationLayers.tsx
  └─ lock icon per row
```

---

## Sprint 4 — Version History & Conflict Handling

> Goal: never lose work; support team workflows where multiple people edit.

### 4.1 Version history list

**Why:** `version` is already tracked on the backend but unused on the frontend.

**Backend changes:**

```
backend/src/modules/annotations/
  └─ Add AnnotationVersion model to Prisma schema:
       id, annotationId, version, data (Json), savedBy (userId), createdAt

  └─ annotations.repository.ts
       - on upsert, also insert into AnnotationVersion before updating

  └─ annotations.routes.ts
       GET /annotations/:uploadId/history  → list of { version, savedBy, createdAt }
       GET /annotations/:uploadId/history/:version  → full data for that version

  └─ annotations.controller.ts + service.ts
       - add getAnnotationHistory, getAnnotationVersion handlers
```

**Frontend changes:**

```
annotationApi.ts
  └─ add getAnnotationHistory query
  └─ add restoreAnnotationVersion mutation (POST to save an old version as current)

New component: AnnotationHistory.tsx
  └─ collapsible panel listing versions: "v3 — saved 2 hours ago by you"
  └─ click to preview (load into a read-only canvas overlay)
  └─ "Restore this version" button

AnnotationCanvas.tsx
  └─ add history panel toggle button to the status bar
```

### 4.2 Conflict detection (optimistic locking)

**Why:** If two users save at the same time, the backend should reject the stale write.

**Backend changes:**

```
annotations.service.ts
  └─ saveAnnotation now accepts expectedVersion: number
  └─ before upsert, check current DB version === expectedVersion
  └─ if mismatch → throw AnnotationConflictError (new error type)

annotations.schema.ts
  └─ add expectedVersion: z.number().int().nonnegative() to saveAnnotationSchema
```

**Frontend changes:**

```
useAnnotationState.ts
  └─ track localVersion: number (starts from savedData version on load)
  └─ include it in every save call
  └─ on conflict error (new error code), show toast:
       "Someone else saved newer annotations. Reload to see their changes,
        or force-save to overwrite."
  └─ expose conflictData: AnnotationData | null for a merge UI
```

---

## Sprint 5 — Collaboration (Real-time)

> Goal: multiple users annotating the same image simultaneously.
> Your project already has Socket.IO — this builds on top of it.

### 5.1 Presence cursors

**Implementation:**

```
Backend: new Socket.IO namespace /annotations
  └─ on join(uploadId): add socket to room uploadId
  └─ on cursor-move(uploadId, x, y, userName): broadcast to room (exclude sender)
  └─ on leave(uploadId): broadcast user-left

Frontend: new hook useAnnotationPresence(uploadId)
  └─ emit cursor position on mousemove (throttled 50ms)
  └─ receive cursor positions for other users → render colored dot + name label
       as absolutely-positioned divs over the image container (outside the canvas)
```

### 5.2 Real-time annotation sync

**Implementation:**

```
Backend Socket.IO namespace /annotations
  └─ on annotation-change(uploadId, patch):
       - validate patch
       - broadcast to room (exclude sender)
       - optionally persist immediately (debounced)

Frontend: useFabricCanvas.ts
  └─ on every recordChange, emit annotation-change with just the delta (not full data)
  └─ receive remote patches → apply to canvas without triggering local history
  └─ show "X is annotating…" label in status bar
```

### 5.3 Comments on annotations

**Implementation:**

```
New Prisma model: AnnotationComment
  id, annotationId (FK to Annotation), objectId (the specific shape), 
  userId, body, resolved, createdAt, updatedAt

New routes:
  POST   /annotations/:uploadId/comments         → create comment on a shape
  GET    /annotations/:uploadId/comments         → list all comments
  PATCH  /annotations/:uploadId/comments/:id     → resolve/unresolve
  DELETE /annotations/:uploadId/comments/:id     → delete

Frontend: AnnotationComment.tsx
  └─ click on any annotation in select mode → comment thread popover appears
  └─ shows existing comments, text input for new comment
  └─ resolved comments shown collapsed
  └─ comment count badge on shapes that have comments
```

---

## Sprint 6 — Export & Share

### 6.1 Server-side rendered export

**Why:** Client-side canvas-to-PNG is low quality and doesn't embed the original image's full resolution.

**Implementation:**

```
Backend:
  GET /annotations/:uploadId/export?format=png|jpeg

  annotations.service.ts
    └─ fetch original image from S3 via presigned URL (use node-fetch or axios)
    └─ use Sharp to load the original image
    └─ for each annotation object, draw onto a Sharp composite layer:
         - rect, circle → Sharp draw API
         - text → use @napi-rs/canvas or sharp-text for text rendering
         - freedraw path → SVG path → rasterize as overlay
    └─ return final buffer with Content-Type: image/png

  Better alternative: use Puppeteer/headless Chrome on backend:
    └─ render the AnnotationCanvas component as HTML
    └─ screenshot it at full resolution
    └─ return PNG
```

```bash
npm install sharp           # already likely installed
npm install puppeteer       # optional, for high-fidelity export
```

### 6.2 Copy annotated image to clipboard

```
useFabricCanvas.ts / downloadAnnotated()
  └─ after compositing to offscreen canvas:
       offscreen.toBlob(blob => navigator.clipboard.write([new ClipboardItem({"image/png": blob})]))
  └─ expose copyToClipboard() alongside downloadAnnotated()

AnnotationToolbar.tsx
  └─ add "Copy to Clipboard" button next to "Download PNG"
```

### 6.3 Public share link

**Implementation:**

```
Backend:
  POST /annotations/:uploadId/share
    └─ generate a signed token (uuid or JWT with expiry)
    └─ store in new ShareToken model: token, uploadId, expiresAt, createdBy
    └─ return shareable URL: /view/:token

  GET /view/:token (public, no auth)
    └─ resolve token → uploadId → load image URL + annotation data
    └─ return read-only view

Frontend: new page AnnotationViewPage.tsx
  └─ render AnnotationCanvas in read-only mode (no toolbar, no editing)
  └─ "Open in editor" button if the viewer is the owner
```

---

## Sprint 7 — Polish & Accessibility

### 7.1 Tool keyboard shortcuts

```
AnnotationCanvas.tsx  (keydown handler)
  └─ V → select
  └─ P or B → freedraw
  └─ R → rect
  └─ E → ellipse
  └─ L → line
  └─ T → text
  └─ G → pin (G for "geo-pin")
  └─ A → arrow
  └─ X → eraser

AnnotationToolbar.tsx
  └─ show shortcut key badge on each tool button (small grey letter in corner)
```

### 7.2 Object count + limit warning

```
AnnotationCanvas.tsx
  └─ derive objectCount from fabricRef.current.getObjects().length
  └─ show in status bar: "12 objects"
  └─ when objectCount >= 450: show amber warning "Approaching 500 object limit"
  └─ when objectCount === 500: disable all drawing tools, show red banner
```

### 7.3 First-time onboarding overlay

```
New component: AnnotationOnboarding.tsx
  └─ shown when: no saved annotation exists AND canvas has never been touched
  └─ semi-transparent overlay with 4 hotspot callouts:
       1. "Pick a tool from the right panel"
       2. "Draw on the image"
       3. "Undo mistakes with Ctrl+Z"
       4. "Save when done"
  └─ "Got it" button dismisses and sets localStorage flag: annotation_onboarded = true
```

### 7.4 Snap to grid

```
useFabricCanvas.ts
  └─ add snapToGrid: boolean prop (default false)
  └─ on object:moving, round left/top to nearest gridSize (default 10px)
  └─ draw faint grid lines on a background canvas layer when snap is active

AnnotationToolbar.tsx
  └─ add snap-to-grid toggle button (grid icon) in the Appearance section
```

### 7.5 Touch / stylus support

```
useFabricCanvas.ts
  └─ add touch event handlers for tools that use mouse:down/move/up
  └─ map TouchEvent to equivalent pointer coords
  └─ test on iPad with Apple Pencil (Fabric's PencilBrush already supports pressure if browser exposes it)
  └─ set touch-action: none on the canvas wrapper

AnnotationCanvas.tsx
  └─ detect touch device → swap cursor classes to hidden (no cursor on touch screens)
```

### 7.6 Accessibility

```
AnnotationToolbar.tsx
  └─ add aria-label to every button (currently only title)
  └─ add aria-pressed to tool buttons (active state)
  └─ add role="toolbar" + aria-label="Annotation tools" to toolbar wrapper
  └─ color swatches need aria-label="Red" etc.

useFabricCanvas.ts
  └─ Tab-cycle between canvas objects using arrow keys when in select mode
       canvas.on("object:selected") → set focus outline
```

---

## Dependency Summary

| Package | Sprint | Why |
|---------|--------|-----|
| `react-hot-toast` | 1 | Toast notifications |
| `@dnd-kit/core` + `@dnd-kit/sortable` | 3 | Drag-reorder layers panel |
| `sharp` | 6 | Server-side export (likely already installed) |
| `puppeteer` | 6 | Optional high-fidelity server-side export |

Everything else uses APIs already in the project (Fabric.js, Socket.IO, Prisma, RTK Query).

---

## File Change Map

```
frontend/src/features/annotations/
├── types.ts                          ← add arrow, opacity, fillColor, label fields
├── annotationApi.ts                  ← add history, share, export endpoints
├── hooks/
│   ├── useFabricCanvas.ts            ← zoom, arrow, copy/paste, snap, touch, opacity
│   ├── useAnnotationState.ts         ← auto-save, conflict detection, version
│   └── useAnnotationPresence.ts      ← NEW: Socket.IO cursors
├── components/
│   ├── AnnotationCanvas.tsx          ← wire all new hooks, keyboard shortcuts
│   ├── AnnotationToolbar.tsx         ← context panel, filled shapes, font size
│   ├── AnnotationLayers.tsx          ← NEW: object list panel
│   ├── AnnotationHistory.tsx         ← NEW: version history panel
│   ├── AnnotationComments.tsx        ← NEW: per-shape comment thread
│   └── AnnotationOnboarding.tsx      ← NEW: first-time overlay

frontend/src/pages/
└── AnnotationViewPage.tsx            ← NEW: public read-only share view

backend/src/modules/annotations/
├── annotations.service.ts            ← MIME types, conflict check, history, export
├── annotations.repository.ts         ← version history, share tokens, comments
├── annotations.schema.ts             ← arrow type, opacity, expectedVersion
├── annotations.types.ts              ← arrow, opacity, fillColor
├── annotations.routes.ts             ← history, share, export, comments routes
├── annotations.controller.ts         ← new endpoint handlers
└── annotations.error.ts              ← add AnnotationConflictError

backend/prisma/schema.prisma
└── add: AnnotationVersion, ShareToken, AnnotationComment models
```

---

## What NOT to build (keep it focused)

- **Annotation templates** — save a set of annotations as a reusable template. Overkill for now; add only if users explicitly request it.
- **AI-assisted annotation** — auto-detect regions with computer vision. Separate project entirely.
- **Video annotation** — completely different architecture (frame-by-frame timecodes).
- **3D / depth annotation** — out of scope for a 2D image tool.
