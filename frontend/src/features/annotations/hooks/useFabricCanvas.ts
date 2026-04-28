import { useEffect, useRef, useCallback, useState } from "react";
import { Canvas, Rect, Circle, Ellipse, Line, IText, Path, PencilBrush, Polygon as FabricPolygon, Polyline as FabricPolyline, Image as FabricImage } from "fabric";
import type { AnnotationTool, AnnotationData, AnnotationObject, LayerItem } from "../types";

// Outer teardrop + inner circle hole (evenodd) → classic Google Maps pin
const PIN_PATH_DATA = "M 9,0 C 4.029,0 0,4.029 0,9 C 0,15.75 9,24 9,24 C 9,24 18,15.75 18,9 C 18,4.029 13.971,0 9,0 Z M 12,9 A 3,3 0 1,0 6,9 A 3,3 0 1,0 12,9 Z";
const PIN_WIDTH  = 18;
const PIN_HEIGHT = 24;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

// ─── Hex color + opacity → rgba string ───────────────────────────────────────
function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h.padEnd(6, "0");
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const DEFAULT_FILL_OPACITY = 0.4;
function computeFill(fillColor?: string, fillOpacity?: number): string {
  if (!fillColor) return "transparent";
  return hexToRgba(fillColor, fillOpacity ?? DEFAULT_FILL_OPACITY);
}

function tag(fabricObj: any, id: string, type: string, color: string, visible = true, name?: string, fillColor?: string, fillOpacity?: number) {
  fabricObj.annotationId      = id;
  fabricObj.annotationType    = type;
  fabricObj.annotationColor   = color;
  fabricObj.visible           = visible;
  if (name)                      fabricObj.annotationName        = name;
  if (fillColor)                 fabricObj.annotationFillColor   = fillColor;
  if (fillOpacity !== undefined) fabricObj.annotationFillOpacity = fillOpacity;
}

// ─── Paint annotation objects onto the canvas (does NOT touch backgroundImage) ─
function paintCanvas(canvas: Canvas, data: AnnotationData) {
  const W = canvas.width!;
  const H = canvas.height!;

  // Remove only annotation objects — backgroundImage is untouched (it's not in getObjects())
  canvas.remove(...canvas.getObjects());

  const sorted = [...(data?.objects ?? [])].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
  );

  for (const obj of sorted) {
    const vis = obj.visible !== false;

    if (obj.type === "rect") {
      const rect = new Rect({
        left: obj.x * W, top: obj.y * H,
        width: obj.w * W, height: obj.h * H,
        fill: computeFill(obj.fillColor, obj.fillOpacity),
        stroke: obj.color, strokeWidth: obj.strokeWidth, strokeUniform: true,
        selectable: false,
      });
      tag(rect, obj.id, "rect", obj.color, vis, obj.name, obj.fillColor, obj.fillOpacity);
      canvas.add(rect);

    } else if (obj.type === "pin") {
      const scale = (obj.size ?? 4) / 4;
      const pin = new Path(PIN_PATH_DATA, {
        left: obj.x * W - (PIN_WIDTH * scale) / 2,
        top:  obj.y * H - (PIN_HEIGHT * scale),
        scaleX: scale, scaleY: scale,
        fill: obj.color, stroke: "#ffffff", strokeWidth: 1.5 / scale,
        fillRule: "evenodd", selectable: false,
      });
      tag(pin, obj.id, "pin", obj.color, vis, obj.name);
      canvas.add(pin);

    } else if (obj.type === "circle") {
      const el = new Ellipse({
        left: (obj.cx - obj.rx) * W, top: (obj.cy - obj.ry) * H,
        rx: obj.rx * W, ry: obj.ry * H,
        fill: computeFill(obj.fillColor, obj.fillOpacity),
        stroke: obj.color, strokeWidth: obj.strokeWidth, strokeUniform: true,
        selectable: false,
      });
      tag(el, obj.id, "circle", obj.color, vis, obj.name, obj.fillColor, obj.fillOpacity);
      canvas.add(el);

    } else if (obj.type === "line" || obj.type === "dottedline") {
      const l = new Line([obj.x1 * W, obj.y1 * H, obj.x2 * W, obj.y2 * H], {
        stroke: obj.color, strokeWidth: obj.strokeWidth, strokeUniform: true,
        selectable: false,
        ...(obj.type === "dottedline"
          ? { strokeDashArray: [obj.strokeWidth * 2.5, obj.strokeWidth * 2.5] }
          : {}),
      });
      tag(l, obj.id, obj.type, obj.color, vis, obj.name);
      canvas.add(l);

    } else if (obj.type === "text") {
      const t = new IText(obj.text, {
        left: obj.x * W, top: obj.y * H,
        fontSize: obj.fontSize, fill: obj.color,
        selectable: false, editable: false,
      });
      tag(t, obj.id, "text", obj.color, vis, obj.name);
      canvas.add(t);

    } else if (obj.type === "freedraw") {
      const scaleX = W / obj.refW;
      const scaleY = H / obj.refH;
      const path = new Path(obj.path as any, {
        left: obj.left * W, top: obj.top * H,
        scaleX, scaleY,
        fill: "transparent", stroke: obj.color, strokeWidth: obj.strokeWidth,
        selectable: false,
      });
      tag(path, obj.id, "freedraw", obj.color, vis, obj.name);
      canvas.add(path);

    } else if (obj.type === "polygon") {
      const canvasPts = obj.points.map(p => ({ x: p.x * W, y: p.y * H }));
      const poly = new FabricPolygon(canvasPts, {
        fill: computeFill(obj.fillColor, obj.fillOpacity),
        stroke: obj.color, strokeWidth: obj.strokeWidth, strokeUniform: true,
        selectable: false, objectCaching: false,
      });
      tag(poly, obj.id, "polygon", obj.color, vis, obj.name, obj.fillColor, obj.fillOpacity);
      (poly as any)._canvasPoints = canvasPts;
      canvas.add(poly);
    }
  }

  canvas.requestRenderAll();
}

// ─── Load and set background image on the canvas ─────────────────────────────
function setBackgroundImage(canvas: Canvas, src: string): Promise<void> {
  return FabricImage.fromURL(src, { crossOrigin: "anonymous" }).then((img) => {
    const W = canvas.width!;
    const H = canvas.height!;
    img.set({
      left: 0, top: 0,
      scaleX: W / (img.width  ?? W),
      scaleY: H / (img.height ?? H),
      originX: "left", originY: "top",
      selectable: false, evented: false,
      hasControls: false, hasBorders: false,
    });
    // excludeFromExport so our serialize() never touches it
    (img as any).excludeFromExport = true;
    canvas.backgroundImage = img;
    canvas.requestRenderAll();
  });
}

export function useFabricCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  imageRef: React.RefObject<HTMLImageElement | null>,
  tool: AnnotationTool,
  color: string,
  strokeWidth: number,
  ready: boolean,
  onCanvasChange?: () => void,
) {
  const fabricRef = useRef<Canvas | null>(null);

  const onChangeRef = useRef(onCanvasChange);
  onChangeRef.current = onCanvasChange;

  const historyRef    = useRef<AnnotationData[]>([]);
  const historyIdxRef = useRef(-1);
  const [historyIdx,  setHistoryIdx]  = useState(-1);
  const [layerList,   setLayerList]   = useState<LayerItem[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  const isRestoringRef    = useRef(false);
  const isDrawingShapeRef = useRef(false);

  // Pan state
  const isPanningRef  = useRef(false);
  const isDraggingRef = useRef(false);
  const lastPanPoint  = useRef({ x: 0, y: 0 });

  const recordChangeRef = useRef<() => void>(() => {});

  // ─── Serialize ────────────────────────────────────────────────────────────
  const serialize = useCallback((): AnnotationData => {
    const canvas = fabricRef.current;
    if (!canvas) return { objects: [] };
    const W = canvas.width!;
    const H = canvas.height!;
    const objects: AnnotationObject[] = [];

    canvas.getObjects().forEach((obj, zIndex) => {
      const id          = (obj as any).annotationId          ?? crypto.randomUUID();
      const type        = (obj as any).annotationType        ?? obj.type;
      const visible     = (obj as any).visible               !== false;
      const name        = (obj as any).annotationName        as string | undefined;
      const fillColor   = (obj as any).annotationFillColor   as string | undefined;
      const fillOpacity = (obj as any).annotationFillOpacity as number | undefined;

      if (type === "rect") {
        objects.push({
          id, type: "rect", zIndex, visible, name, fillColor, fillOpacity,
          x: obj.left! / W, y: obj.top! / H,
          w: (obj.width!  * (obj.scaleX ?? 1)) / W,
          h: (obj.height! * (obj.scaleY ?? 1)) / H,
          color: (obj as Rect).stroke as string ?? "#ef4444",
          strokeWidth: (obj as Rect).strokeWidth ?? 2,
        });
      } else if (type === "pin") {
        const p = obj as Path;
        const scale = p.scaleX ?? 1;
        objects.push({
          id, type: "pin", zIndex, visible, name,
          x: (obj.left! + (PIN_WIDTH  * scale) / 2) / W,
          y: (obj.top!  + (PIN_HEIGHT * scale))      / H,
          size: scale * 4,
          color: (obj as any).annotationColor as string ?? "#ef4444",
        });
      } else if (type === "circle") {
        const el = obj as Ellipse;
        objects.push({
          id, type: "circle", zIndex, visible, name, fillColor, fillOpacity,
          cx: (obj.left! + el.rx!) / W, cy: (obj.top! + el.ry!) / H,
          rx: el.rx! / W, ry: el.ry! / H,
          color: el.stroke as string ?? "#ef4444",
          strokeWidth: el.strokeWidth ?? 2,
        });
      } else if (type === "line" || type === "dottedline") {
        const l = obj as Line;
        objects.push({
          id, type: type as "line" | "dottedline", zIndex, visible, name,
          x1: l.x1! / W, y1: l.y1! / H,
          x2: l.x2! / W, y2: l.y2! / H,
          color: l.stroke as string ?? "#ef4444",
          strokeWidth: l.strokeWidth ?? 2,
        });
      } else if (type === "text") {
        const t = obj as IText;
        objects.push({
          id, type: "text", zIndex, visible, name,
          x: obj.left! / W, y: obj.top! / H,
          text: t.text ?? "", fontSize: t.fontSize ?? 20,
          color: t.fill as string ?? "#ef4444",
        });
      } else if (type === "freedraw") {
        const p = obj as Path;
        objects.push({
          id, type: "freedraw", zIndex, visible, name,
          path: (p as any).path as (string | number)[][],
          refW: W, refH: H,
          left: p.left! / W, top: p.top! / H,
          color: p.stroke as string ?? "#ef4444",
          strokeWidth: p.strokeWidth ?? 3,
        });
      } else if (type === "polygon") {
        const rawPts = (obj as any)._canvasPoints as { x: number; y: number }[] | undefined;
        if (rawPts && rawPts.length >= 3) {
          objects.push({
            id, type: "polygon", zIndex, visible, name, fillColor, fillOpacity,
            points: rawPts.map(p => ({ x: p.x / W, y: p.y / H })),
            color: (obj as FabricPolygon).stroke as string ?? "#ef4444",
            strokeWidth: (obj as FabricPolygon).strokeWidth ?? 2,
          });
        }
      }
    });

    return { objects };
  }, []);

  // ─── Layer list ───────────────────────────────────────────────────────────
  const updateLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) { setLayerList([]); return; }
    const objs = canvas.getObjects(); // backgroundImage not included
    setLayerList(
      [...objs].reverse().map((o, ri) => {
        const bounds = (o as any).getBoundingRect?.() as { left: number; top: number; width: number; height: number } | undefined;
        const name = (o as any).annotationName as string | undefined;
        return {
          id:          (o as any).annotationId       as string ?? "",
          type:        (o as any).annotationType     as string ?? o.type,
          color:       (o as any).annotationColor    as string ?? "#666666",
          visible:     (o as any).visible            !== false,
          zIndex:      objs.length - 1 - ri,
          name,
          fillColor:   (o as any).annotationFillColor   as string | undefined,
          fillOpacity: (o as any).annotationFillOpacity as number | undefined,
          labelPos:    name && bounds
            ? { x: bounds.left + bounds.width / 2, y: bounds.top }
            : undefined,
        };
      })
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  recordChangeRef.current = () => {
    if (isRestoringRef.current || isDrawingShapeRef.current) return;
    onChangeRef.current?.();
    const snapshot = serialize();
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snapshot);
    const MAX_HISTORY = 50;
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }
    historyIdxRef.current = historyRef.current.length - 1;
    setHistoryIdx(historyIdxRef.current);
    updateLayers();
  };

  // ─── Canvas initialisation ────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !canvasRef.current || !imageRef.current) return;

    const img = imageRef.current;

    const canvas = new Canvas(canvasRef.current, {
      width:  img.offsetWidth,
      height: img.offsetHeight,
      selection: false,
      stopContextMenu: true,
      renderOnAddRemove: true, // keep simple — we call requestRenderAll where needed
    });

    // Position the Fabric wrapper to cover the container
    const wrapper = canvas.wrapperEl as HTMLElement;
    Object.assign(wrapper.style, {
      position: "absolute",
      top: "0", left: "0",
      width:  `${img.offsetWidth}px`,
      height: `${img.offsetHeight}px`,
    });

    fabricRef.current = canvas;

    // Load the image as Fabric's built-in backgroundImage (excluded from getObjects / events)
    setBackgroundImage(canvas, img.src);

    // ── Wheel zoom ────────────────────────────────────────────────────────
    // Attach directly to upperCanvasEl with passive:false so preventDefault works
    const upperCanvas = canvas.upperCanvasEl as HTMLCanvasElement;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.1 : 0.9; // scroll up = zoom in
      const zoom = Math.min(Math.max(canvas.getZoom() * factor, MIN_ZOOM), MAX_ZOOM);
      canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
      canvas.requestRenderAll();
      setCurrentZoom(parseFloat(zoom.toFixed(4)));
    };
    upperCanvas.addEventListener("wheel", handleWheel, { passive: false });

    // ── Pan ───────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) isPanningRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isPanningRef.current = false;
        isDraggingRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;
      if (isPanningRef.current || e.button === 1) {
        isDraggingRef.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDraggingRef.current) return;
      const e = opt.e as MouseEvent;
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      // absolutePan takes the top-left corner of the viewport in canvas coords — negate delta
      const vpt = canvas.viewportTransform!;
      canvas.setViewportTransform([vpt[0], vpt[1], vpt[2], vpt[3], vpt[4] + dx, vpt[5] + dy]);
      canvas.requestRenderAll();
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    });

    canvas.on("mouse:up", () => { isDraggingRef.current = false; });

    // ── Change tracking ───────────────────────────────────────────────────
    const notify = () => recordChangeRef.current();
    canvas.on("object:added",    notify);
    canvas.on("object:modified", notify);
    canvas.on("object:removed",  notify);

    const onSelect   = (e: any) => setSelectedId((e.selected?.[0] as any)?.annotationId ?? null);
    const onDeselect = ()       => setSelectedId(null);
    canvas.on("selection:created", onSelect);
    canvas.on("selection:updated", onSelect);
    canvas.on("selection:cleared", onDeselect);

    // Seed history
    historyRef.current    = [{ objects: [] }];
    historyIdxRef.current = 0;
    setHistoryIdx(0);

    // ResizeObserver: resize canvas when the img element changes size
    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!imageRef.current || !fabricRef.current) return;
        resizeCanvasRef.current(
          imageRef.current.offsetWidth,
          imageRef.current.offsetHeight,
        );
      }, 100);
    });
    ro.observe(img);

    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
      upperCanvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tool switching ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    canvas.getObjects().forEach((o) => {
      if ((o as any).type === "i-text") (o as IText).exitEditing?.();
    });

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.getObjects().forEach((o) => { o.selectable = false; });

    if (tool === "select") {
      canvas.selection = true;
      canvas.getObjects().forEach((o) => {
        o.selectable = (o as any).visible !== false;
      });
      return () => {
        if (!fabricRef.current) return;
        fabricRef.current.discardActiveObject();
        fabricRef.current.selection = false;
        fabricRef.current.getObjects().forEach((o) => { o.selectable = false; });
        fabricRef.current.requestRenderAll();
      };
    }

    if (tool === "freedraw") {
      const brush = new PencilBrush(canvas);
      brush.color = color;
      brush.width = strokeWidth;
      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;

      const onPathCreated = (e: any) => {
        if (e.path) tag(e.path, crypto.randomUUID(), "freedraw", color);
      };
      canvas.on("path:created", onPathCreated);

      return () => {
        if (fabricRef.current) {
          fabricRef.current.isDrawingMode = false;
          fabricRef.current.off("path:created", onPathCreated);
        }
      };
    }

    if (tool === "rect") {
      let startX = 0, startY = 0;
      let activeRect: Rect | null = null;
      let isDown = false;

      const onDown = (e: any) => {
        if (isDraggingRef.current) return;
        const ptr = e.scenePoint;
        startX = ptr.x; startY = ptr.y;
        isDown = true;
        isDrawingShapeRef.current = true;
        activeRect = new Rect({
          left: startX, top: startY, width: 0, height: 0,
          fill: "transparent", stroke: color, strokeWidth, strokeUniform: true,
          selectable: false,
        });
        tag(activeRect, crypto.randomUUID(), "rect", color);
        canvas.add(activeRect);
      };
      const onMove = (e: any) => {
        if (!isDown || !activeRect) return;
        const ptr = e.scenePoint;
        const dw = ptr.x - startX, dh = ptr.y - startY;
        activeRect.set({
          width:  Math.abs(dw), height: Math.abs(dh),
          left:   dw < 0 ? ptr.x : startX,
          top:    dh < 0 ? ptr.y : startY,
        });
        canvas.requestRenderAll();
      };
      const onUp = () => {
        const tooSmall = activeRect && (activeRect.width ?? 0) < 4 && (activeRect.height ?? 0) < 4;
        if (tooSmall) canvas.remove(activeRect!);
        isDown = false; activeRect = null;
        isDrawingShapeRef.current = false;
        if (!tooSmall) recordChangeRef.current();
      };

      canvas.on("mouse:down", onDown);
      canvas.on("mouse:move", onMove);
      canvas.on("mouse:up",   onUp);
      return () => {
        canvas.off("mouse:down", onDown);
        canvas.off("mouse:move", onMove);
        canvas.off("mouse:up",   onUp);
        isDrawingShapeRef.current = false;
      };
    }

    if (tool === "circle") {
      let startX = 0, startY = 0;
      let activeEllipse: Ellipse | null = null;
      let isDown = false;

      const onDown = (e: any) => {
        if (isDraggingRef.current) return;
        const ptr = e.scenePoint;
        startX = ptr.x; startY = ptr.y;
        isDown = true;
        isDrawingShapeRef.current = true;
        activeEllipse = new Ellipse({
          left: startX, top: startY, rx: 0, ry: 0,
          fill: "transparent", stroke: color, strokeWidth, strokeUniform: true,
          selectable: false,
        });
        tag(activeEllipse, crypto.randomUUID(), "circle", color);
        canvas.add(activeEllipse);
      };
      const onMove = (e: any) => {
        if (!isDown || !activeEllipse) return;
        const ptr = e.scenePoint;
        activeEllipse.set({
          rx: Math.abs(ptr.x - startX) / 2, ry: Math.abs(ptr.y - startY) / 2,
          left: Math.min(startX, ptr.x), top: Math.min(startY, ptr.y),
        });
        canvas.requestRenderAll();
      };
      const onUp = () => {
        const tooSmall = activeEllipse && (activeEllipse.rx ?? 0) < 2;
        if (tooSmall) canvas.remove(activeEllipse!);
        isDown = false; activeEllipse = null;
        isDrawingShapeRef.current = false;
        if (!tooSmall) recordChangeRef.current();
      };

      canvas.on("mouse:down", onDown);
      canvas.on("mouse:move", onMove);
      canvas.on("mouse:up",   onUp);
      return () => {
        canvas.off("mouse:down", onDown);
        canvas.off("mouse:move", onMove);
        canvas.off("mouse:up",   onUp);
        isDrawingShapeRef.current = false;
      };
    }

    if (tool === "line" || tool === "dottedline") {
      const isDotted = tool === "dottedline";
      let startX = 0, startY = 0;
      let activeLine: Line | null = null;
      let isDown = false;

      const onDown = (e: any) => {
        if (isDraggingRef.current) return;
        const ptr = e.scenePoint;
        startX = ptr.x; startY = ptr.y;
        isDown = true;
        isDrawingShapeRef.current = true;
        activeLine = new Line([startX, startY, startX, startY], {
          stroke: color, strokeWidth, strokeUniform: true, selectable: false,
          ...(isDotted ? { strokeDashArray: [strokeWidth * 2.5, strokeWidth * 2.5] } : {}),
        });
        tag(activeLine, crypto.randomUUID(), tool, color);
        canvas.add(activeLine);
      };
      const onMove = (e: any) => {
        if (!isDown || !activeLine) return;
        const ptr = e.scenePoint;
        activeLine.set({ x2: ptr.x, y2: ptr.y });
        canvas.requestRenderAll();
      };
      const onUp = () => {
        const tooSmall = activeLine &&
          Math.hypot((activeLine.x2 ?? 0) - (activeLine.x1 ?? 0), (activeLine.y2 ?? 0) - (activeLine.y1 ?? 0)) < 4;
        if (tooSmall) canvas.remove(activeLine!);
        isDown = false; activeLine = null;
        isDrawingShapeRef.current = false;
        if (!tooSmall) recordChangeRef.current();
      };

      canvas.on("mouse:down", onDown);
      canvas.on("mouse:move", onMove);
      canvas.on("mouse:up",   onUp);
      return () => {
        canvas.off("mouse:down", onDown);
        canvas.off("mouse:move", onMove);
        canvas.off("mouse:up",   onUp);
        isDrawingShapeRef.current = false;
      };
    }

    if (tool === "text") {
      const onDown = (e: any) => {
        if (isDraggingRef.current) return;
        const ptr = e.scenePoint;
        const text = new IText("Text", {
          left: ptr.x, top: ptr.y, fontSize: 20,
          fill: color, selectable: true, editable: true,
        });
        tag(text, crypto.randomUUID(), "text", color);
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
      };
      canvas.on("mouse:down", onDown);
      return () => { canvas.off("mouse:down", onDown); };
    }

    if (tool === "pin") {
      const onDown = (e: any) => {
        if (isDraggingRef.current) return;
        const ptr = e.scenePoint;
        const scale = strokeWidth / 4;
        const pin = new Path(PIN_PATH_DATA, {
          left: ptr.x - (PIN_WIDTH * scale) / 2,
          top:  ptr.y - (PIN_HEIGHT * scale),
          scaleX: scale, scaleY: scale,
          fill: color, stroke: "#ffffff", strokeWidth: 1.5 / scale,
          fillRule: "evenodd", selectable: false,
        });
        tag(pin, crypto.randomUUID(), "pin", color);
        (pin as any).size = strokeWidth;
        canvas.add(pin);
      };
      canvas.on("mouse:down", onDown);
      return () => { canvas.off("mouse:down", onDown); };
    }

    if (tool === "polygon") {
      const pts: { x: number; y: number }[] = [];
      const CLOSE_DIST = 14;
      let rubberLine: Line | null = null;
      let pathLine: FabricPolyline | null = null;
      const dots: Circle[] = [];
      let done = false;
      isDrawingShapeRef.current = true;

      const refreshPath = () => {
        if (pathLine) { canvas.remove(pathLine); pathLine = null; }
        if (pts.length < 2) return;
        pathLine = new FabricPolyline(pts.map(p => ({ x: p.x, y: p.y })), {
          fill: "transparent", stroke: color, strokeWidth,
          selectable: false, evented: false, objectCaching: false,
        });
        canvas.add(pathLine);
        dots.forEach(d => { canvas.remove(d); canvas.add(d); });
      };

      const cleanupTemp = () => {
        if (rubberLine) { canvas.remove(rubberLine); rubberLine = null; }
        if (pathLine)   { canvas.remove(pathLine);   pathLine   = null; }
        dots.forEach(d => canvas.remove(d));
        dots.length = 0;
      };

      const commit = () => {
        if (done) return;
        done = true;
        cleanupTemp();
        if (pts.length < 3) {
          isDrawingShapeRef.current = false;
          canvas.requestRenderAll();
          return;
        }
        const canvasPts = [...pts];
        const poly = new FabricPolygon(canvasPts, {
          fill: "transparent", stroke: color, strokeWidth, strokeUniform: true,
          selectable: false, objectCaching: false,
        });
        tag(poly, crypto.randomUUID(), "polygon", color);
        (poly as any)._canvasPoints = canvasPts;
        isDrawingShapeRef.current = false;
        canvas.add(poly);
        pts.length = 0;
      };

      const onDown = (e: any) => {
        if (done || isDraggingRef.current) return;
        const ptr = e.scenePoint;
        if (pts.length >= 3) {
          const d = Math.hypot(ptr.x - pts[0].x, ptr.y - pts[0].y);
          if (d <= CLOSE_DIST) { commit(); return; }
        }
        pts.push({ x: ptr.x, y: ptr.y });
        const isFirst = pts.length === 1;
        const dot = new Circle({
          left: ptr.x - 5, top: ptr.y - 5,
          radius: 5,
          fill: isFirst ? "#ffffff" : color,
          stroke: color, strokeWidth: 1.5,
          selectable: false, evented: false, objectCaching: false,
        });
        canvas.add(dot);
        dots.push(dot);
        refreshPath();
        canvas.requestRenderAll();
      };

      const onMove = (e: any) => {
        if (done || pts.length === 0 || isDraggingRef.current) return;
        const ptr  = e.scenePoint;
        const last = pts[pts.length - 1];
        if (pts.length >= 3 && dots.length > 0) {
          const d = Math.hypot(ptr.x - pts[0].x, ptr.y - pts[0].y);
          dots[0].set(d <= CLOSE_DIST
            ? { radius: 7, fill: color, strokeWidth: 2 }
            : { radius: 5, fill: "#ffffff", strokeWidth: 1.5 });
        }
        if (rubberLine) canvas.remove(rubberLine);
        rubberLine = new Line([last.x, last.y, ptr.x, ptr.y], {
          stroke: color, strokeWidth: Math.max(1, strokeWidth - 1),
          strokeDashArray: [5, 4],
          selectable: false, evented: false, objectCaching: false,
        });
        canvas.add(rubberLine);
        canvas.requestRenderAll();
      };

      const onDblClick = () => {
        if (done) return;
        if (pts.length > 0) {
          pts.pop();
          const lastDot = dots.pop();
          if (lastDot) canvas.remove(lastDot);
          refreshPath();
        }
        pts.length >= 3 ? commit() : cleanupTemp();
        if (!done) { pts.length = 0; canvas.requestRenderAll(); }
      };

      canvas.on("mouse:down",     onDown);
      canvas.on("mouse:move",     onMove);
      canvas.on("mouse:dblclick", onDblClick);

      return () => {
        canvas.off("mouse:down",     onDown);
        canvas.off("mouse:move",     onMove);
        canvas.off("mouse:dblclick", onDblClick);
        if (!done) commit();
        isDrawingShapeRef.current = false;
      };
    }

    if (tool === "eraser") {
      const onDown = (e: any) => {
        if (isDraggingRef.current) return;
        const target = e.target;
        if (target) { canvas.remove(target); canvas.requestRenderAll(); }
      };
      canvas.on("mouse:down", onDown);
      return () => { canvas.off("mouse:down", onDown); };
    }
  }, [tool, color, strokeWidth, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Deserialize ─────────────────────────────────────────────────────────
  const deserialize = useCallback((data: AnnotationData) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.off("object:added");
    isRestoringRef.current = true;
    paintCanvas(canvas, data);
    isRestoringRef.current = false;

    historyRef.current    = [data];
    historyIdxRef.current = 0;
    setHistoryIdx(0);

    const notify = () => recordChangeRef.current();
    canvas.on("object:added", notify);

    updateLayers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Undo / Redo ─────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    setHistoryIdx(historyIdxRef.current);
    isRestoringRef.current = true;
    paintCanvas(canvas, historyRef.current[historyIdxRef.current]);
    isRestoringRef.current = false;
    onChangeRef.current?.();
    updateLayers();
  }, [updateLayers]);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    setHistoryIdx(historyIdxRef.current);
    isRestoringRef.current = true;
    paintCanvas(canvas, historyRef.current[historyIdxRef.current]);
    isRestoringRef.current = false;
    onChangeRef.current?.();
    updateLayers();
  }, [updateLayers]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < historyRef.current.length - 1;

  // ─── Clear / Delete ───────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    isRestoringRef.current = true;
    canvas.remove(...canvas.getObjects());
    canvas.requestRenderAll();
    isRestoringRef.current = false;
    recordChangeRef.current();
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const selected = canvas.getActiveObjects();
    if (selected.length === 0) return;
    isRestoringRef.current = true;
    canvas.remove(...selected);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    isRestoringRef.current = false;
    recordChangeRef.current();
  }, []);

  // ─── Download ─────────────────────────────────────────────────────────────
  const downloadAnnotated = useCallback((_?: HTMLImageElement, filename = "annotated-image.png") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const prevVpt = [...canvas.viewportTransform!] as [number, number, number, number, number, number];
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
    const dataURL = canvas.toDataURL({ format: "png", multiplier: 1 });
    canvas.setViewportTransform(prevVpt);
    canvas.requestRenderAll();
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataURL;
    link.click();
  }, []);

  // ─── Layer management ─────────────────────────────────────────────────────
  const bringForward = useCallback((id: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    canvas.bringObjectForward(obj);
    canvas.requestRenderAll();
    updateLayers();
    recordChangeRef.current();
  }, [updateLayers]);

  const sendBackward = useCallback((id: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    canvas.sendObjectBackwards(obj);
    canvas.requestRenderAll();
    updateLayers();
    recordChangeRef.current();
  }, [updateLayers]);

  const bringToFront = useCallback((id: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    canvas.bringObjectToFront(obj);
    canvas.requestRenderAll();
    updateLayers();
    recordChangeRef.current();
  }, [updateLayers]);

  const sendToBack = useCallback((id: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    canvas.sendObjectToBack(obj);
    canvas.requestRenderAll();
    updateLayers();
    recordChangeRef.current();
  }, [updateLayers]);

  const setLayerVisibility = useCallback((id: string, visible: boolean) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    obj.visible = visible;
    if (!visible) {
      if (canvas.getActiveObject() === obj) canvas.discardActiveObject();
      obj.selectable = false;
    }
    canvas.requestRenderAll();
    updateLayers();
    recordChangeRef.current();
  }, [updateLayers]);

  const selectLayerObject = useCallback((id: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj || obj.visible === false) return;
    obj.selectable = true;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }, []);

  const deleteById = useCallback((id: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    isRestoringRef.current = true;
    if (canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.remove(obj);
    canvas.requestRenderAll();
    isRestoringRef.current = false;
    recordChangeRef.current();
  }, []);

  // ─── Resize (window / container resize) ──────────────────────────────────
  const resizeCanvasRef = useRef<(w: number, h: number) => void>(() => {});

  const resizeCanvas = useCallback((newW: number, newH: number) => {
    const canvas = fabricRef.current;
    if (!canvas || newW <= 0 || newH <= 0) return;
    const snapshot = serialize();
    canvas.setDimensions({ width: newW, height: newH });
    const wrapper = canvas.wrapperEl as HTMLElement;
    if (wrapper) { wrapper.style.width = `${newW}px`; wrapper.style.height = `${newH}px`; }
    // Re-scale backgroundImage
    if (canvas.backgroundImage) {
      const bg = canvas.backgroundImage as FabricImage;
      bg.set({
        scaleX: newW / (bg.width  ?? newW),
        scaleY: newH / (bg.height ?? newH),
      });
    }
    isRestoringRef.current = true;
    paintCanvas(canvas, snapshot);
    isRestoringRef.current = false;
    updateLayers();
  }, [serialize, updateLayers]); // eslint-disable-line react-hooks/exhaustive-deps

  resizeCanvasRef.current = resizeCanvas;

  // ─── Zoom controls ─────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const zoom = Math.min(+(canvas.getZoom() * 1.25).toFixed(4), MAX_ZOOM);
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, zoom);
    canvas.requestRenderAll();
    setCurrentZoom(zoom);
  }, []);

  const zoomOut = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const zoom = Math.max(+(canvas.getZoom() / 1.25).toFixed(4), MIN_ZOOM);
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, zoom);
    canvas.requestRenderAll();
    setCurrentZoom(zoom);
  }, []);

  const resetZoom = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
    setCurrentZoom(1);
  }, []);

  // ─── Object properties ────────────────────────────────────────────────────
  const renameObject = useCallback((id: string, name: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    (obj as any).annotationName = name || undefined;
    recordChangeRef.current();
  }, []);

  const setObjectFillColor = useCallback((id: string, fillColor: string | null) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    if (fillColor) {
      const opacity = (obj as any).annotationFillOpacity ?? DEFAULT_FILL_OPACITY;
      obj.set({ fill: computeFill(fillColor, opacity) });
      (obj as any).annotationFillColor   = fillColor;
      (obj as any).annotationFillOpacity = opacity;
    } else {
      obj.set({ fill: "transparent" });
      (obj as any).annotationFillColor   = undefined;
      (obj as any).annotationFillOpacity = undefined;
    }
    canvas.requestRenderAll();
    recordChangeRef.current();
  }, []);

  const setObjectFillOpacity = useCallback((id: string, opacity: number) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => (o as any).annotationId === id);
    if (!canvas || !obj) return;
    const fillColor = (obj as any).annotationFillColor as string | undefined;
    if (!fillColor) return;
    obj.set({ fill: computeFill(fillColor, opacity) });
    (obj as any).annotationFillOpacity = opacity;
    canvas.requestRenderAll();
    recordChangeRef.current();
  }, []);

  return {
    fabricRef, serialize, deserialize, clearAll, deleteSelected, deleteById,
    undo, redo, canUndo, canRedo, downloadAnnotated,
    layerList, bringForward, sendBackward, bringToFront, sendToBack,
    setLayerVisibility, selectLayerObject,
    selectedId, renameObject, setObjectFillColor, setObjectFillOpacity,
    resizeCanvas,
    currentZoom, zoomIn, zoomOut, resetZoom,
  };
}
