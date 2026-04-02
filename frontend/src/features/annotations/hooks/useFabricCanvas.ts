import { useEffect, useRef, useCallback, useState } from "react";
import { Canvas, Rect, Circle, Ellipse, Line, IText, Path, PencilBrush, Polygon as FabricPolygon, Polyline as FabricPolyline } from "fabric";
import type { AnnotationTool, AnnotationData, AnnotationObject } from "../types";

const PIN_RADIUS = 8;

// ─── Paint a snapshot onto a cleared canvas ───────────────────────────────────
// Used by both deserialize and history restoration so the logic lives once.
function paintCanvas(canvas: Canvas, data: AnnotationData) {
  const W = canvas.width!;
  const H = canvas.height!;

  canvas.clear();

  data.objects.forEach((obj) => {
    if (obj.type === "rect") {
      const rect = new Rect({
        left: obj.x * W, top: obj.y * H,
        width: obj.w * W, height: obj.h * H,
        fill: "transparent", stroke: obj.color, strokeWidth: obj.strokeWidth,
        selectable: false,
      });
      (rect as any).annotationId   = obj.id;
      (rect as any).annotationType = "rect";
      canvas.add(rect);

    } else if (obj.type === "pin") {
      const pin = new Circle({
        left: obj.x * W - PIN_RADIUS, top: obj.y * H - PIN_RADIUS,
        radius: PIN_RADIUS, fill: obj.color,
        stroke: "#ffffff", strokeWidth: 1.5, selectable: false,
      });
      (pin as any).annotationId   = obj.id;
      (pin as any).annotationType = "pin";
      canvas.add(pin);

    } else if (obj.type === "circle") {
      const el = new Ellipse({
        left: (obj.cx - obj.rx) * W, top: (obj.cy - obj.ry) * H,
        rx: obj.rx * W, ry: obj.ry * H,
        fill: "transparent", stroke: obj.color, strokeWidth: obj.strokeWidth,
        selectable: false,
      });
      (el as any).annotationId   = obj.id;
      (el as any).annotationType = "circle";
      canvas.add(el);

    } else if (obj.type === "line" || obj.type === "dottedline") {
      const l = new Line([obj.x1 * W, obj.y1 * H, obj.x2 * W, obj.y2 * H], {
        stroke: obj.color, strokeWidth: obj.strokeWidth, selectable: false,
        ...(obj.type === "dottedline"
          ? { strokeDashArray: [obj.strokeWidth * 2.5, obj.strokeWidth * 2.5] }
          : {}),
      });
      (l as any).annotationId   = obj.id;
      (l as any).annotationType = obj.type;
      canvas.add(l);

    } else if (obj.type === "text") {
      const t = new IText(obj.text, {
        left: obj.x * W, top: obj.y * H,
        fontSize: obj.fontSize, fill: obj.color,
        selectable: false, editable: false,
      });
      (t as any).annotationId   = obj.id;
      (t as any).annotationType = "text";
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
      (path as any).annotationId   = obj.id;
      (path as any).annotationType = "freedraw";
      canvas.add(path);

    } else if (obj.type === "polygon") {
      const canvasPts = obj.points.map(p => ({ x: p.x * W, y: p.y * H }));
      const poly = new FabricPolygon(canvasPts, {
        fill:        "transparent",
        stroke:      obj.color,
        strokeWidth: obj.strokeWidth,
        selectable:  false,
        objectCaching: false,
      });
      (poly as any).annotationId    = obj.id;
      (poly as any).annotationType  = "polygon";
      (poly as any)._canvasPoints   = canvasPts;
      canvas.add(poly);
    }
  });

  canvas.renderAll();
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

  // Stable ref so event handlers never go stale
  const onChangeRef = useRef(onCanvasChange);
  onChangeRef.current = onCanvasChange;

  // ─── History ─────────────────────────────────────────────────────────────
  const historyRef    = useRef<AnnotationData[]>([]);
  const historyIdxRef = useRef(-1);
  const [historyIdx, setHistoryIdx] = useState(-1); // drives canUndo / canRedo
  const isRestoringRef    = useRef(false); // true while replaying history / deserializing
  const isDrawingShapeRef = useRef(false); // true during mouse-drag shape creation

  // Mutable ref updated each render so canvas event listeners always call the
  // latest version (same pattern as onChangeRef).
  const recordChangeRef = useRef<() => void>(() => {});

  // ─── Serialise canvas → AnnotationData ───────────────────────────────────
  const serialize = useCallback((): AnnotationData => {
    const canvas = fabricRef.current;
    if (!canvas) return { objects: [] };

    const W = canvas.width!;
    const H = canvas.height!;
    const objects: AnnotationObject[] = [];

    canvas.getObjects().forEach((obj) => {
      const id   = (obj as any).annotationId   ?? crypto.randomUUID();
      const type = (obj as any).annotationType ?? obj.type;

      if (type === "rect") {
        objects.push({
          id, type: "rect",
          x: obj.left! / W, y: obj.top! / H,
          w: (obj.width!  * (obj.scaleX ?? 1)) / W,
          h: (obj.height! * (obj.scaleY ?? 1)) / H,
          color:       (obj as Rect).stroke as string ?? "#ef4444",
          strokeWidth: (obj as Rect).strokeWidth ?? 2,
        });
      } else if (type === "pin") {
        const r = (obj as Circle).radius ?? PIN_RADIUS;
        objects.push({
          id, type: "pin",
          x: (obj.left! + r) / W, y: (obj.top! + r) / H,
          color: (obj as Circle).fill as string ?? "#ef4444",
        });
      } else if (type === "circle") {
        const el = obj as Ellipse;
        objects.push({
          id, type: "circle",
          cx: (obj.left! + el.rx!) / W, cy: (obj.top! + el.ry!) / H,
          rx: el.rx! / W, ry: el.ry! / H,
          color:       el.stroke as string ?? "#ef4444",
          strokeWidth: el.strokeWidth ?? 2,
        });
      } else if (type === "line" || type === "dottedline") {
        const l = obj as Line;
        objects.push({
          id, type: type as "line" | "dottedline",
          x1: l.x1! / W, y1: l.y1! / H,
          x2: l.x2! / W, y2: l.y2! / H,
          color:       l.stroke as string ?? "#ef4444",
          strokeWidth: l.strokeWidth ?? 2,
        });
      } else if (type === "text") {
        const t = obj as IText;
        objects.push({
          id, type: "text",
          x: obj.left! / W, y: obj.top! / H,
          text: t.text ?? "", fontSize: t.fontSize ?? 20,
          color: t.fill as string ?? "#ef4444",
        });
      } else if (obj.type === "path") {
        const p = obj as Path;
        objects.push({
          id, type: "freedraw",
          path:        (p as any).path as (string | number)[][],
          refW: W, refH: H,
          left: p.left! / W, top: p.top! / H,
          color:       p.stroke as string ?? "#ef4444",
          strokeWidth: p.strokeWidth ?? 3,
        });
      } else if (type === "polygon") {
        const rawPts = (obj as any)._canvasPoints as { x: number; y: number }[] | undefined;
        if (rawPts && rawPts.length >= 3) {
          objects.push({
            id, type: "polygon",
            points:      rawPts.map(p => ({ x: p.x / W, y: p.y / H })),
            color:       (obj as FabricPolygon).stroke as string ?? "#ef4444",
            strokeWidth: (obj as FabricPolygon).strokeWidth ?? 2,
          });
        }
      }
    });

    return { objects };
  }, []);

  // Keep recordChangeRef current every render
  recordChangeRef.current = () => {
    // Bail during history replay, deserialize, or mid-drag shape creation
    if (isRestoringRef.current || isDrawingShapeRef.current) return;
    onChangeRef.current?.();
    const snapshot = serialize();
    // Truncate redo stack when a new action is recorded
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snapshot);
    historyIdxRef.current = historyRef.current.length - 1;
    setHistoryIdx(historyIdxRef.current);
  };

  // ─── Canvas initialisation ────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !canvasRef.current || !imageRef.current) return;

    const img = imageRef.current;

    const canvas = new Canvas(canvasRef.current, {
      width: img.offsetWidth,
      height: img.offsetHeight,
      selection: false,
      stopContextMenu: true,
    });

    const wrapper = canvas.wrapperEl as HTMLElement;
    Object.assign(wrapper.style, {
      position: "absolute",
      top: "0", left: "0",
      pointerEvents: "auto",
    });

    const notify = () => recordChangeRef.current();
    canvas.on("object:added",    notify);
    canvas.on("object:modified", notify);
    canvas.on("object:removed",  notify);
    // NOTE: path:created is intentionally omitted — Fabric also fires object:added
    // for the same path, so listening to both would double-record every freedraw stroke.

    fabricRef.current = canvas;

    // Seed history with an empty state so the very first drawn shape can be undone
    historyRef.current    = [{ objects: [] }];
    historyIdxRef.current = 0;
    setHistoryIdx(0);

    const ro = new ResizeObserver(() => {
      if (!imageRef.current) return;
      canvas.setWidth(imageRef.current.offsetWidth);
      canvas.setHeight(imageRef.current.offsetHeight);
      canvas.renderAll();
    });
    ro.observe(img);

    return () => {
      ro.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tool switching ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.getObjects().forEach((o) => { o.selectable = false; });

    if (tool === "select") {
      canvas.selection = true;
      canvas.getObjects().forEach((o) => { o.selectable = true; });
      return () => {
        if (!fabricRef.current) return;
        fabricRef.current.selection = false;
        fabricRef.current.getObjects().forEach((o) => { o.selectable = false; });
      };
    }

    if (tool === "freedraw") {
      const brush = new PencilBrush(canvas);
      brush.color = color;
      brush.width = strokeWidth;
      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;
      return () => {
        if (fabricRef.current) fabricRef.current.isDrawingMode = false;
      };
    }

    if (tool === "rect") {
      let startX = 0, startY = 0;
      let activeRect: Rect | null = null;
      let isDown = false;

      const onDown = (e: any) => {
        const ptr = e.scenePoint;
        startX = ptr.x; startY = ptr.y;
        isDown = true;
        isDrawingShapeRef.current = true; // suppress history until mouse:up
        activeRect = new Rect({
          left: startX, top: startY, width: 0, height: 0,
          fill: "transparent", stroke: color, strokeWidth, selectable: false,
        });
        (activeRect as any).annotationId   = crypto.randomUUID();
        (activeRect as any).annotationType = "rect";
        canvas.add(activeRect);
      };
      const onMove = (e: any) => {
        if (!isDown || !activeRect) return;
        const ptr = e.scenePoint;
        const dw = ptr.x - startX, dh = ptr.y - startY;
        activeRect.set({
          width: Math.abs(dw), height: Math.abs(dh),
          left: dw < 0 ? ptr.x : startX,
          top:  dh < 0 ? ptr.y : startY,
        });
        canvas.renderAll();
      };
      const onUp = () => {
        const tooSmall = activeRect && (activeRect.width ?? 0) < 4 && (activeRect.height ?? 0) < 4;
        if (tooSmall) canvas.remove(activeRect!);
        isDown = false;
        activeRect = null;
        isDrawingShapeRef.current = false;
        if (!tooSmall) recordChangeRef.current(); // record exactly once
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
        const ptr = e.scenePoint;
        startX = ptr.x; startY = ptr.y;
        isDown = true;
        isDrawingShapeRef.current = true;
        activeEllipse = new Ellipse({
          left: startX, top: startY, rx: 0, ry: 0,
          fill: "transparent", stroke: color, strokeWidth, selectable: false,
        });
        (activeEllipse as any).annotationId   = crypto.randomUUID();
        (activeEllipse as any).annotationType = "circle";
        canvas.add(activeEllipse);
      };
      const onMove = (e: any) => {
        if (!isDown || !activeEllipse) return;
        const ptr = e.scenePoint;
        activeEllipse.set({
          rx: Math.abs(ptr.x - startX) / 2, ry: Math.abs(ptr.y - startY) / 2,
          left: Math.min(startX, ptr.x), top: Math.min(startY, ptr.y),
        });
        canvas.renderAll();
      };
      const onUp = () => {
        const tooSmall = activeEllipse && (activeEllipse.rx ?? 0) < 2;
        if (tooSmall) canvas.remove(activeEllipse!);
        isDown = false;
        activeEllipse = null;
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
        const ptr = e.scenePoint;
        startX = ptr.x; startY = ptr.y;
        isDown = true;
        isDrawingShapeRef.current = true;
        activeLine = new Line([startX, startY, startX, startY], {
          stroke: color, strokeWidth, selectable: false,
          ...(isDotted ? { strokeDashArray: [strokeWidth * 2.5, strokeWidth * 2.5] } : {}),
        });
        (activeLine as any).annotationId   = crypto.randomUUID();
        (activeLine as any).annotationType = tool;
        canvas.add(activeLine);
      };
      const onMove = (e: any) => {
        if (!isDown || !activeLine) return;
        const ptr = e.scenePoint;
        activeLine.set({ x2: ptr.x, y2: ptr.y });
        canvas.renderAll();
      };
      const onUp = () => {
        const tooSmall = activeLine &&
          Math.hypot((activeLine.x2 ?? 0) - (activeLine.x1 ?? 0), (activeLine.y2 ?? 0) - (activeLine.y1 ?? 0)) < 4;
        if (tooSmall) canvas.remove(activeLine!);
        isDown = false;
        activeLine = null;
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
        const ptr = e.scenePoint;
        const text = new IText("Text", {
          left: ptr.x, top: ptr.y, fontSize: 20,
          fill: color, selectable: true, editable: true,
        });
        (text as any).annotationId   = crypto.randomUUID();
        (text as any).annotationType = "text";
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
        const ptr = e.scenePoint;
        const pin = new Circle({
          left: ptr.x - PIN_RADIUS, top: ptr.y - PIN_RADIUS,
          radius: PIN_RADIUS, fill: color,
          stroke: "#ffffff", strokeWidth: 1.5, selectable: false,
        });
        (pin as any).annotationId   = crypto.randomUUID();
        (pin as any).annotationType = "pin";
        canvas.add(pin);
      };
      canvas.on("mouse:down", onDown);
      return () => { canvas.off("mouse:down", onDown); };
    }

    if (tool === "polygon") {
      const pts: { x: number; y: number }[] = [];
      const CLOSE_DIST = 14; // px — snap-to-close threshold
      let rubberLine: Line | null = null;
      let pathLine: FabricPolyline | null = null;
      const dots: Circle[] = [];
      let done = false;
      isDrawingShapeRef.current = true; // suppress temp-object events until commit

      // Rebuild the "drawn so far" polyline (sits below dots)
      const refreshPath = () => {
        if (pathLine) { canvas.remove(pathLine); pathLine = null; }
        if (pts.length < 2) return;
        pathLine = new FabricPolyline(pts.map(p => ({ x: p.x, y: p.y })), {
          fill: "transparent", stroke: color, strokeWidth,
          selectable: false, evented: false, objectCaching: false,
        });
        canvas.add(pathLine);
        // Keep dots on top of the path
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
          canvas.renderAll();
          return;
        }
        const canvasPts = [...pts];
        const poly = new FabricPolygon(canvasPts, {
          fill:        "transparent",
          stroke:      color,
          strokeWidth,
          selectable:  false,
          objectCaching: false,
        });
        (poly as any).annotationId   = crypto.randomUUID();
        (poly as any).annotationType = "polygon";
        (poly as any)._canvasPoints  = canvasPts;
        isDrawingShapeRef.current = false; // allow the object:added below to record
        canvas.add(poly);
        canvas.renderAll();
        pts.length = 0;
      };

      const onDown = (e: any) => {
        if (done) return;
        const ptr = e.scenePoint;

        // Snap-to-close: clicking near the first point closes the polygon
        if (pts.length >= 3) {
          const d = Math.hypot(ptr.x - pts[0].x, ptr.y - pts[0].y);
          if (d <= CLOSE_DIST) { commit(); return; }
        }

        pts.push({ x: ptr.x, y: ptr.y });

        // First dot is hollow (white fill) — visual cue for the close target
        const isFirst = pts.length === 1;
        const dot = new Circle({
          left: ptr.x - 5, top: ptr.y - 5,
          radius:      5,
          fill:        isFirst ? "#ffffff" : color,
          stroke:      color,
          strokeWidth: 1.5,
          selectable: false, evented: false, objectCaching: false,
        });
        canvas.add(dot);
        dots.push(dot);

        refreshPath();
        canvas.renderAll();
      };

      const onMove = (e: any) => {
        if (done || pts.length === 0) return;
        const ptr  = e.scenePoint;
        const last = pts[pts.length - 1];

        // Snap indicator: highlight first dot when cursor is near it
        if (pts.length >= 3 && dots.length > 0) {
          const d = Math.hypot(ptr.x - pts[0].x, ptr.y - pts[0].y);
          dots[0].set(d <= CLOSE_DIST
            ? { radius: 7, fill: color, strokeWidth: 2 }
            : { radius: 5, fill: "#ffffff", strokeWidth: 1.5 });
        }

        // Rubber-band line: dashed preview from last point to cursor
        if (rubberLine) canvas.remove(rubberLine);
        rubberLine = new Line([last.x, last.y, ptr.x, ptr.y], {
          stroke: color, strokeWidth: Math.max(1, strokeWidth - 1),
          strokeDashArray: [5, 4],
          selectable: false, evented: false, objectCaching: false,
        });
        canvas.add(rubberLine);
        canvas.renderAll();
      };

      const onDblClick = () => {
        if (done) return;
        // The second mousedown of the dblclick already pushed a point — undo it
        if (pts.length > 0) {
          pts.pop();
          const lastDot = dots.pop();
          if (lastDot) canvas.remove(lastDot);
          refreshPath();
        }
        pts.length >= 3 ? commit() : cleanupTemp();
        if (!done) { pts.length = 0; canvas.renderAll(); }
      };

      canvas.on("mouse:down",     onDown);
      canvas.on("mouse:move",     onMove);
      canvas.on("mouse:dblclick", onDblClick);

      return () => {
        canvas.off("mouse:down",     onDown);
        canvas.off("mouse:move",     onMove);
        canvas.off("mouse:dblclick", onDblClick);
        // Auto-close when switching away (≥3 pts → commit; else discard)
        if (!done) commit();
        isDrawingShapeRef.current = false;
      };
    }

    if (tool === "eraser") {
      const onDown = (e: any) => {
        const target = e.target;
        if (target) { canvas.remove(target); canvas.renderAll(); }
      };
      canvas.on("mouse:down", onDown);
      return () => { canvas.off("mouse:down", onDown); };
    }
  }, [tool, color, strokeWidth, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Deserialise (load from backend) ─────────────────────────────────────
  // Sets the loaded state as the base history entry (undo can't go past this).
  const deserialize = useCallback((data: AnnotationData) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Suppress the object:added events that paintCanvas will fire
    canvas.off("object:added");
    isRestoringRef.current = true;

    paintCanvas(canvas, data);

    isRestoringRef.current = false;

    // Seed history with the just-loaded state so undo can't go past it
    historyRef.current    = [data];
    historyIdxRef.current = 0;
    setHistoryIdx(0);

    // Re-attach the unified change listener
    const notify = () => recordChangeRef.current();
    canvas.on("object:added", notify);
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
    onChangeRef.current?.(); // mark dirty
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    setHistoryIdx(historyIdxRef.current);
    isRestoringRef.current = true;
    paintCanvas(canvas, historyRef.current[historyIdxRef.current]);
    isRestoringRef.current = false;
    onChangeRef.current?.(); // mark dirty
  }, []);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < historyRef.current.length - 1;

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    isRestoringRef.current = true;
    canvas.clear();
    canvas.renderAll();
    isRestoringRef.current = false;
    recordChangeRef.current(); // one history entry for the whole clear
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const selected = canvas.getActiveObjects();
    if (selected.length === 0) return;
    isRestoringRef.current = true;
    selected.forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
    isRestoringRef.current = false;
    recordChangeRef.current(); // one history entry for the whole deletion
  }, []);

  const downloadAnnotated = useCallback((imageEl: HTMLImageElement, filename = "annotated-image.png") => {
    const canvas = fabricRef.current;
    if (!canvas || !imageEl) return;

    const W = canvas.width!;
    const H = canvas.height!;

    const offscreen = document.createElement("canvas");
    offscreen.width  = W;
    offscreen.height = H;
    const ctx = offscreen.getContext("2d")!;

    // Draw the base photo first
    ctx.drawImage(imageEl, 0, 0, W, H);

    // Overlay the Fabric annotation layer (transparent background PNG)
    const annotImg = new Image();
    annotImg.onload = () => {
      ctx.drawImage(annotImg, 0, 0, W, H);
      const link = document.createElement("a");
      link.download = filename;
      link.href = offscreen.toDataURL("image/png");
      link.click();
    };
    annotImg.src = canvas.toDataURL({ format: "png" });
  }, []);

  return { fabricRef, serialize, deserialize, clearAll, deleteSelected, undo, redo, canUndo, canRedo, downloadAnnotated };
}
