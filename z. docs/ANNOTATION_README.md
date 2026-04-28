# 🖊️ Annotation System — Complete Technical Reference

> **File location**: `z. docs/ANNOTATION_README.md`  
> **Last updated**: 2026-04-08

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Choices](#2-technology-choices)
3. [File Map](#3-file-map)
4. [Data Model & Database](#4-data-model--database)
5. [Backend API](#5-backend-api)
6. [Coordinate System](#6-coordinate-system)
7. [Serialization Format](#7-serialization-format-json-contract)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Drawing Tools — How Each One Works](#9-drawing-tools--how-each-one-works)
10. [History (Undo / Redo)](#10-history-undo--redo)
11. [Layer Management](#11-layer-management)
12. [Save & Load Flow](#12-save--load-flow)
13. [Download (Flat PNG)](#13-download-flat-png)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)
15. [Known Bugs](#15-known-bugs)
16. [Missing Features](#16-missing-features)
17. [Production Readiness Gaps](#17-production-readiness-gaps)

---

## 1. Overview

The annotation system lets a user open any uploaded **image** file they own and draw a set of vector annotations on top of it. Annotations are persisted server-side as a versioned JSON blob against the upload ID. On revisit, the saved annotations are re-painted on top of the image exactly as left.

**Primary user flow:**

```
Uploads page → click "Annotate" on an image row
  → /uploads/:uploadId/annotate
    → AnnotationPage fetches a presigned URL for the image
    → AnnotationCanvas renders image + transparent Fabric.js canvas overlay
    → User draws shapes / text / pins
    → "Save Changes" → POST /annotations → upsert in DB
```

---

## 2. Technology Choices

### Frontend — Fabric.js v7

- Package: `fabric@^7.2.0`  
- **Why Fabric**: gives a managed canvas with object model, selection, hit-testing, transforms, and serialization built in. Avoids raw canvas pointer math for every shape.
- **What we use from Fabric**: `Canvas`, `Rect`, `Ellipse`, `Line`, `IText`, `Path`, `PencilBrush`, `Polygon`, `Polyline`, `Circle`.
- **What we do NOT use from Fabric**: Fabric's own JSON serialization (`canvas.toJSON / loadFromJSON`). We maintain our own normalized JSON format (§7) so coordinates are image-relative (0–1) rather than pixel-absolute. This makes saved annotations resolution-independent.

### Frontend — Redux Toolkit Query (RTK Query)

- Used via `annotationApi.ts` with `createApi`.
- Two endpoints: `getAnnotation(uploadId)` and `saveAnnotation({ uploadId, data })`.
- Cache tag: `["Annotation"]` keyed by `uploadId`.

### Backend — Express + Prisma + Zod

- Express router under `/annotations`.
- Zod `discriminatedUnion` validates every annotation object type individually before it reaches the DB.
- Prisma `annotation.upsert` — one row per upload, replaced on every save.

---

## 3. File Map

```
frontend/src/
  pages/
    AnnotationPage.tsx           ← Route entry point. Fetches presigned URL, renders shell.

  features/annotations/
    types.ts                     ← All TS type definitions (AnnotationTool, every shape, LayerItem)
    annotationApi.ts             ← RTK Query API slice (GET + POST)

    hooks/
      useAnnotationState.ts      ← Thin hook: wraps RTK Query, exposes isDirty + save()
      useFabricCanvas.ts         ← The engine (870 LOC). Fabric init, all tools, undo, layers, serialize/deserialize.

    components/
      AnnotationCanvas.tsx       ← Orchestrator: composes hooks, renders img + canvas, keyboard shortcuts
      AnnotationToolbar.tsx      ← Right-panel sidebar: tools grid, color picker, stroke slider, actions
      AnnotationLayers.tsx       ← Layer panel (inside toolbar sidebar)

backend/src/modules/annotations/
  annotations.routes.ts          ← POST / and GET /:uploadId, behind authenticateMiddleware
  annotations.controller.ts      ← Thin controller, error mapping
  annotations.service.ts         ← Business logic: ownership check, mime type guard, 500-obj limit
  annotations.repository.ts      ← Prisma upsert + findUnique
  annotations.schema.ts          ← Zod schemas (discriminatedUnion per shape type)
  annotations.types.ts           ← Backend TypeScript types (mirrors frontend types.ts)
  annotations.error.ts           ← 4 typed error classes
```

---

## 4. Data Model & Database

### Prisma model

```prisma
model Annotation {
  id        String   @id @default(uuid())
  uploadId  String   @unique          // 1:1 with Upload
  userId    String                    // denormalized owner (for access checks)
  data      Json                      // The full AnnotationData JSON blob
  version   Int      @default(1)      // Incremented on every upsert
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  upload Upload @relation(fields: [uploadId], references: [id], onDelete: Cascade)
  @@map("annotations")
}
```

Key facts:
- **1:1** with Upload. Each image has at most one annotation document.
- `version` auto-increments via `{ increment: 1 }` in Prisma upsert.
- Cascade delete: upload deleted → annotation deleted.
- No index on `userId` — all queries go through the unique `uploadId`.
- Old versions are **not stored** — every save overwrites the previous JSON.

---

## 5. Backend API

### Authentication
All routes require a valid JWT access token via `authenticateMiddleware`. Token → `req.user.userId`.

---

### `POST /annotations` — Save annotations

Request body (Zod-validated via `saveAnnotationSchema`):
```json
{
  "uploadId": "<uuid>",
  "data": {
    "objects": [ ...AnnotationObject[] ]
  }
}
```

**Validation chain** (in service):
1. `data.objects.length <= 500` → else `ANNOTATION_PAYLOAD_TOO_LARGE` (400)
2. Upload must exist → else `ANNOTATION_NOT_FOUND` (404)
3. `upload.ownerId === req.user.userId` → else `ANNOTATION_ACCESS_DENIED` (403)
4. `upload.mimeType` in `["image/jpeg","image/jpg","image/png","image/webp"]` → else `ANNOTATION_UNSUPPORTED_TYPE` (400)

Success response:
```json
{ "success": true, "code": "ANNOTATION_SAVED", "data": { "id": "<uuid>", "version": 2 } }
```

> ⚠️ BUG: Controller has a debug `console.log(req.body)` on line 19–22 that dumps the full annotation JSON to stdout on every save. Must be removed.

---

### `GET /annotations/:uploadId` — Load annotations

Path param: `uploadId` (UUID, validated via `uploadIdParamSchema`)

Same ownership + mime type access checks as POST.

Success response (annotation exists):
```json
{
  "success": true,
  "code": "ANNOTATION_FETCHED",
  "data": {
    "annotation": {
      "id": "<uuid>", "uploadId": "<uuid>", "userId": "<uuid>",
      "data": { "objects": [...] },
      "version": 3,
      "createdAt": "...", "updatedAt": "..."
    }
  }
}
```

No annotation yet → `"annotation": null`.

---

## 6. Coordinate System

All positions and dimensions are stored as **normalized fractions of the image dimensions** (0.0–1.0). This makes annotations resolution-independent — they render correctly at any display size.

```
normalizedX = pixelX / canvasWidth
normalizedY = pixelY / canvasHeight
```

**Conversion happens in:**
- `serialize()` — pixel → normalized when saving
- `paintCanvas()` — normalized → pixel when loading/undoing

**⚠️ Exception — Lines / Dotted Lines**: `x1, y1, x2, y2` are stored as raw pixel values, NOT normalized. This is a known bug (BUG-001). They appear wrong on resize.

**Exception — Freedraw**: Stores Fabric's SVG path array plus `refW`/`refH` reference dimensions. On repaint, applies `scaleX = canvasWidth / refW`, `scaleY = canvasHeight / refH`.

---

## 7. Serialization Format (JSON Contract)

The `data` JSON in the DB is an `AnnotationData` object:

```typescript
type AnnotationData = { objects: AnnotationObject[] }
```

All shapes include optional `LayerFields`:
```typescript
type LayerFields = {
  zIndex?:  number;   // 0 = bottom of stack
  visible?: boolean;  // false = hidden but still stored
}
```

### Shape schemas

| Type | Key fields | Coordinate type |
|------|-----------|-----------------|
| `rect` | `x, y, w, h, color, strokeWidth` | Normalized (0–1) |
| `circle` | `cx, cy, rx, ry, color, strokeWidth` | Normalized (0–1) |
| `line` | `x1, y1, x2, y2, color, strokeWidth` | ⚠️ Raw pixels (BUG-001) |
| `dottedline` | `x1, y1, x2, y2, color, strokeWidth` | ⚠️ Raw pixels (BUG-001) |
| `text` | `x, y, text, fontSize, color` | x,y normalized; fontSize px |
| `freedraw` | `path, refW, refH, left, top, color, strokeWidth` | refW/H pixel; left/top normalized |
| `pin` | `x, y, color, label?` | x,y normalized |
| `polygon` | `points: [{x,y},...], color, strokeWidth` | Each point normalized |

---

## 8. Frontend Architecture

### Component hierarchy

```
AnnotationPage (route entry, fetches presigned image URL)
  └── AnnotationCanvas (main orchestrator, owns tool/color/strokeWidth state)
        ├── useFabricCanvas    (canvas engine: all drawing, undo, serialize)
        ├── useAnnotationState (RTK Query wrapper: fetch, save, isDirty)
        │
        ├── <img ref={imgRef}>       (base image, gates canvas init via onLoad)
        ├── <canvas ref={canvasRef}> (Fabric canvas, absolute-positioned over img)
        └── AnnotationToolbar (right sidebar, 224px wide)
              ├── History (Undo / Redo buttons)
              ├── Drawing Tools (2-column grid, 10 tools)
              ├── Appearance (color picker + stroke slider)
              ├── AnnotationLayers (collapsible layer panel)
              └── Actions (Delete, Clear All, Download, Save)
```

### State ownership

| State | Lives in | Drives |
|-------|----------|--------|
| `tool` | `AnnotationCanvas` useState | useFabricCanvas + toolbar |
| `color` | `AnnotationCanvas` useState | useFabricCanvas + toolbar |
| `strokeWidth` | `AnnotationCanvas` useState | useFabricCanvas + toolbar |
| `imageLoaded` | `AnnotationCanvas` useState | gates canvas init |
| Fabric canvas objects | `useFabricCanvas` ref | never in React state |
| History stack (snapshots) | `useFabricCanvas` ref | canUndo/canRedo |
| Layer list | `useFabricCanvas` useState | passed up to layer panel |
| `isDirty` | `useAnnotationState` useState | Save button |
| `isSaving` | RTK Query mutation state | Save button spinner |
| Saved JSON | RTK Query cache | deserialized once on load |

### Canvas initialization sequence

1. `AnnotationPage` fetches presigned URL → `setImageUrl`
2. `<img>` fires `onLoad` → `setImageLoaded(true)`
3. `useFabricCanvas` `useEffect([ready])` triggers:
   - `new Canvas(canvasRef.current, { width: img.offsetWidth, height: img.offsetHeight })`
   - Wrapper positioned `absolute top-0 left-0` over the image
   - `ResizeObserver` on `<img>` — on resize: snapshot → resize canvas → repaint
   - Change listeners: `object:added`, `object:modified`, `object:removed` → `recordChange()`
   - History seeded with `[{ objects: [] }]`
4. `AnnotationCanvas` `useEffect([imageLoaded, savedData])`:
   - `hasDeserialized.current` guard ensures this runs at most once
   - Calls `deserialize(savedData)` → `paintCanvas()` → re-seeds history at loaded state

---

## 9. Drawing Tools — How Each One Works

### 🖱️ Select
- `canvas.selection = true`, all **visible** objects become `selectable: true`
- Standard Fabric rubber-band select + object transforms
- `object:modified` fires on move/scale → history entry
- On exit: `discardActiveObject()`, all objects back to `selectable: false`

### ✏️ Freedraw (Pen)
- `canvas.isDrawingMode = true` + `PencilBrush({ color, width: strokeWidth })`
- `path:created` event: tags the resulting Path with UUID + type="freedraw"
- History via `object:added`

### ⬜ Rectangle
- `mouse:down` → creates Rect, sets `isDrawingShapeRef=true` (blocks mid-drag history)
- `mouse:move` → updates width/height, handles negative deltas (upward/leftward drag)
- `mouse:up` → if < 4×4px, removes (click guard); else records one history entry
- Always `fill: "transparent"` — outline only

### 🔵 Ellipse
- Same pattern as Rect, uses Fabric `Ellipse` with `rx = abs(dx)/2`, `ry = abs(dy)/2`
- Minimum size guard: `rx < 2px → discard`

### ➖ Line / Dottedline
- `mouse:down` → `Line([sx,sy,sx,sy])` at start
- `mouse:move` → updates `x2, y2`
- `mouse:up` → `length < 4px → discard`
- Dottedline: `strokeDashArray: [strokeWidth*2.5, strokeWidth*2.5]`

### 🔤 Text
- `mouse:down` → `IText("Text", { editable: true })` placed at click
- `text.enterEditing()` + `text.selectAll()` → user types immediately
- `object:modified` fires when editing ends → history
- Tool exit: `exitEditing()` called on all IText objects

### 📍 Pin
- `mouse:down` → custom SVG `Path` (Google Maps teardrop: evenodd hole)
- Pin tip at `ptr.y`, shape extends upward 24px
- `fill: color`, `stroke: "#ffffff"` — white border ring always
- **No label rendering** — label field exists in type but is ignored (BUG-002)

### ⬡ Polygon
- Click-by-click point placement with rubber-band preview line
- Click within 14px of first point → auto-close
- Double-click → closes if ≥3 points, discards if not
- Switching tool away → auto-commits if ≥3 points
- Visual: hollow white first dot (close target), dashed rubber-band line
- `isDrawingShapeRef=true` throughout → all temp objects suppressed
- Finals: `FabricPolygon` with `_canvasPoints` private property for serialization

### 🧹 Eraser
- `mouse:down` → if `e.target` exists → `canvas.remove(target)` → `renderAll()`
- Removes the **entire** Fabric object (not a paint eraser)

---

## 10. History (Undo / Redo)

- Client-side only — full canvas snapshot per action
- `historyRef`: `AnnotationData[]` (array of snapshots)
- `historyIdxRef`: current position
- Max depth: **50 entries** (oldest dropped beyond that)
- `canUndo = historyIdx > 0`
- `canRedo = historyIdx < history.length - 1`

**When a snapshot is recorded** (`recordChange()`):
- Triggered by `object:added`, `object:modified`, `object:removed` canvas events
- Skipped during `isRestoringRef === true` (undo/redo/deserialize)
- Skipped during `isDrawingShapeRef === true` (mid-drag shape creation)
- Called once on `mouse:up` for Rect, Ellipse, Line after shape finalized
- After `clearAll()` and `deleteSelected()` — one entry for the whole operation

**Undo/Redo** both call `paintCanvas(canvas, snapshot)` to repaint from history and call `updateLayers()` to refresh the panel.

---

## 11. Layer Management

- Derived from live Fabric canvas after each change via `updateLayers()`
- Displayed in **reverse z-order** (top of stack = first row)
- Row actions (on hover): Move Up ↑, Move Down ↓, Toggle Visibility 👁, Delete ✕
- All operations write a history entry

| Operation | Fabric method |
|-----------|--------------|
| Bring Forward | `canvas.bringObjectForward(obj)` |
| Send Backward | `canvas.sendObjectBackwards(obj)` |
| Bring to Front | `canvas.bringObjectToFront(obj)` |
| Send to Back | `canvas.sendObjectToBack(obj)` |
| Hide/Show | `obj.visible = bool` |
| Delete by ID | `canvas.remove(obj)` |

**Layer → canvas selection**: Click row → forces tool to `"select"` → `requestAnimationFrame` → `canvas.setActiveObject(obj)`

> ⚠️ BUG-005: "To Front" / "To Back" shortcut buttons always act on topmost/bottommost layer item, not the currently selected object.

---

## 12. Save & Load Flow

### Save
```
User clicks "Save Changes"
  → handleSave() → serialize() → AnnotationData (normalized coords)
    → useAnnotationState.save(data)
      → POST /annotations
        → Zod validation → ownership check → upsert
      → setIsDirty(false)
```

### Load
```
Component mount, imageLoaded = true
  → useGetAnnotationQuery(uploadId) → GET /annotations/:uploadId
    → savedData = response.data.annotation.data (or null)
  → useEffect([imageLoaded, savedData]):
    if (imageLoaded && savedData && !hasDeserialized.current):
      hasDeserialized.current = true  // runs ONCE
      → deserialize(savedData):
          canvas.off("object:added")   // prevent events during bulk repaint
          isRestoringRef = true
          paintCanvas(canvas, data)    // recreates all shapes from JSON
          isRestoringRef = false
          Re-attach object:added listener
          Seed history at loaded state (index 0)
          updateLayers()
```

---

## 13. Download (Flat PNG)

`downloadAnnotated(imageEl)`:
1. Creates off-screen `<canvas>` at the Fabric canvas dimensions
2. `ctx.drawImage(imageEl, 0, 0, W, H)` — base photo
3. `canvas.toDataURL({ format: "png" })` → loads into a temp `Image`
4. `ctx.drawImage(annotImg, 0, 0, W, H)` — composites annotations
5. `<a download="annotated-image.png">` triggered programmatically

> **Requires**: `<img crossOrigin="anonymous">` (set ✅) AND the R2 bucket must have proper CORS headers allowing `canvas.toDataURL()` on cross-origin image content.

---

## 14. Keyboard Shortcuts

| Shortcut | Action | Guard |
|----------|--------|-------|
| `Ctrl+Z` | Undo | — |
| `Ctrl+Y` | Redo | — |
| `Ctrl+Shift+Z` | Redo | — |
| `Delete` | Delete selected object | Skipped when editing IText |
| `Backspace` | Delete selected object | Skipped when editing IText |

All listeners are on `window`, removed on unmount.

---

## 15. Known Bugs

### 🐛 BUG-001: Line/DottedLine coordinates are pixel-absolute, not normalized
**Root cause**: `serialize()` stores `l.x1!, l.y1!, l.x2!, l.y2!` as raw pixel values (no divide by W/H). `paintCanvas()` then multiplies by `W` and `H` on load, double-scaling them. The backend Zod schema uses `coordPx = z.number().finite()` (unbounded) for line types while all other types use `coordNorm` (0–2 range).  
**Visible symptom**: Lines jump to wrong positions on window resize, or if the container width changes between save and load sessions.  
**Fix needed in `serialize()`**: `x1: l.x1! / W, y1: l.y1! / H, x2: l.x2! / W, y2: l.y2! / H`  
**Fix needed in `paintCanvas()`**: Use `obj.x1 * W` etc. (which is already what paintCanvas does — so just fix serialize and update the backend Zod schema to use `coordNorm`).

---

### 🐛 BUG-002: Pin label never collected or rendered
**Root cause**: `PinAnnotation.label?: string` exists in both frontend `types.ts` and backend `annotations.schema.ts`, but no label input is shown when placing a pin, and `paintCanvas()` doesn't add any text object below/beside the pin.  
**Visible symptom**: No label on pins. The field is silently dropped.

---

### 🐛 BUG-003: Ellipse may serialize incorrectly after handle-resize
**Root cause**: `serialize()` computes `cx = (obj.left + el.rx) / W`. After the user drags a Fabric selection handle, `scaleX`/`scaleY` may be applied. The correct scaled radius is `el.rx * (el.scaleX ?? 1)` — not `el.rx` alone.  
**Visible symptom**: A resized ellipse saves at a slightly different size/position than drawn.

---

### 🐛 BUG-004: `console.log(req.body)` debug log in production controller
**File**: `annotations.controller.ts` lines 19–22  
**Fix**: Delete those 4 lines immediately.

---

### 🐛 BUG-005: "To Front" / "To Back" buttons act on wrong object
**File**: `AnnotationLayers.tsx` lines 187–200  
**Root cause**: "To Front" calls `onBringToFront(layers[0].id)` (always topmost layer) instead of the currently focused/selected layer. Same for "To Back".  
**Visible symptom**: Clicking "To Front" always brings the already-topmost item further forward (no-op). Clicking "To Back" sends the bottommost item further back (no-op).  
**Fix**: Track `selectedLayerId` state in `AnnotationLayers`; use that ID for both buttons.

---

### 🐛 BUG-006: Browser Back button bypasses unsaved-changes warning
**File**: `AnnotationPage.tsx` line 38 (`navigate(-1)`) + `AnnotationCanvas.tsx` lines 68–73  
**Root cause**: `beforeunload` fires for tab close / reload only. React Router's `navigate(-1)` is a JS navigation — `beforeunload` is NOT triggered.  
**Visible symptom**: User draws annotations, clicks "← Back" → all unsaved work silently lost.  
**Fix**: Add `useBlocker(isDirty)` (React Router v6.9+) to show a confirmation dialog before navigation when `isDirty === true`.

---

### 🐛 BUG-007: Error message says "JPEG only" but allows PNG/WebP too
**File**: `annotations.error.ts` line 17  
**Text**: `"Annotations are only supported on JPEG images"`  
**Reality**: Service allows `["image/jpeg","image/jpg","image/png","image/webp"]`.  
**Fix**: Change message to `"Annotations are only supported on image files (JPEG, PNG, WebP)"`.

---

### 🐛 BUG-008: ResizeObserver repaint clears active Fabric selection
**Root cause**: `paintCanvas()` calls `canvas.clear()` before rebuilding — this wipes the active selection. After repaint, `getActiveObject()` returns null.  
**Visible symptom**: Minor UX — user resizes browser window, selection disappears.

---

## 16. Missing Features

| # | Feature | Notes |
|---|---------|-------|
| MISSING-001 | **Arrow tool** | Most expected annotation tool. Needs SVG arrowhead path + Line base. |
| MISSING-002 | **Pin label entry + display** | Label field exists in types but is unused (see BUG-002). |
| MISSING-003 | **Text font size control** | Text always spawns at 20px. Need font-size slider in toolbar (shown instead of stroke slider when text tool is active). |
| MISSING-004 | **Filled shapes** | All shapes are outline-only. No fill color picker. |
| MISSING-005 | **Opacity / alpha control** | No per-object opacity adjustment. |
| MISSING-006 | **Zoom in/out** | Canvas renders at container size. No zoom. Critical for detail work on large images. |
| MISSING-007 | **Copy / Paste objects** | `Ctrl+C / Ctrl+V` to duplicate selected annotation not implemented. |
| MISSING-008 | **Export flat image to server** | `downloadAnnotated()` saves locally only. No flow to save composite back to R2. |
| MISSING-009 | **Version history viewer** | `version` integer increments but old states aren't stored. No rollback. |
| MISSING-010 | **Auto-save / draft** | Manual save only. No heartbeat or drafts. |
| MISSING-011 | **Touch / mobile support** | Custom tool handlers use `e.scenePoint` (Fabric normalized) but no touch gesture handling. |
| MISSING-012 | **Real-time collaborative annotation** | Socket.IO is wired in the project but not connected to the canvas. |
| MISSING-013 | **Non-image files (PDF, etc.)** | MIME type guard intentionally excludes non-images. Would need separate rendering layer. |
| MISSING-014 | **Crop tool** | No ability to crop the base image before annotation. |
| MISSING-015 | **Ruler / measurement overlay** | No scale reference for annotating dimensions. |

---

## 17. Production Readiness Gaps

| Priority | Item | File | Effort |
|----------|------|------|--------|
| 🔴 MUST | Remove `console.log` in controller | `annotations.controller.ts:19` | 2 min |
| 🔴 MUST | Fix line/dottedline coordinate normalization | `useFabricCanvas.ts` serialize/paintCanvas | ~1h |
| 🔴 MUST | Block navigation on unsaved changes | `AnnotationPage.tsx` + RR `useBlocker` | ~2h |
| 🟠 SHOULD | Fix ellipse scale serialize | `useFabricCanvas.ts` serialize | ~1h |
| 🟠 SHOULD | Fix "To Front/Back" targeting | `AnnotationLayers.tsx` | ~30m |
| 🟠 SHOULD | Fix error message text | `annotations.error.ts` | 2 min |
| 🟡 NICE | Arrow tool | `useFabricCanvas.ts` + toolbar | ~4h |
| 🟡 NICE | Pin label | `useFabricCanvas.ts` + types | ~2h |
| 🟡 NICE | Font size slider for text tool | `AnnotationToolbar.tsx` | ~2h |
| 🟡 NICE | Zoom control | `AnnotationCanvas.tsx` + `useFabricCanvas.ts` | ~3h |
| 🟡 NICE | Copy / Paste | `AnnotationCanvas.tsx` + keyboard shortcut | ~2h |
| 🟢 EXTRA | Version history | Schema change + new UI | ~8h |
| 🟢 EXTRA | Auto-save | `useAnnotationState.ts` interval | ~1h |
| 🟢 EXTRA | Touch support | `useFabricCanvas.ts` per-tool handlers | ~4h |

---

*End of document.*
