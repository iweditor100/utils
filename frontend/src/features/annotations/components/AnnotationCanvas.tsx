import { useRef, useState, useEffect, useCallback } from "react";
import { useFabricCanvas } from "../hooks/useFabricCanvas";
import { useAnnotationState } from "../hooks/useAnnotationState";
import { AnnotationToolbar } from "./AnnotationToolbar";
import type { AnnotationTool } from "../types";

interface Props {
  uploadId: string;
  imageUrl: string;
  maxWidth?: number | string;
}

export function AnnotationCanvas({ uploadId, imageUrl, maxWidth = "100%" }: Props) {
  const imgRef    = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool,        setTool]        = useState<AnnotationTool>("select");
  const [color,       setColor]       = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    savedData,
    isLoading,
    isError,
    isDirty,
    isSaving,
    markDirty,
    save,
  } = useAnnotationState(uploadId);

  const {
    fabricRef,
    serialize, deserialize,
    clearAll, deleteSelected, deleteById,
    undo, redo, canUndo, canRedo,
    downloadAnnotated,
    layerList,
    bringForward, sendBackward, bringToFront, sendToBack,
    setLayerVisibility, selectLayerObject,
    selectedId, renameObject, setObjectFillColor, setObjectFillOpacity,
    currentZoom, zoomIn, zoomOut, resetZoom,
  } = useFabricCanvas(canvasRef, imgRef, tool, color, strokeWidth, imageLoaded, markDirty);

  // Only deserialize once on initial load — never on save-triggered refetches
  const hasDeserialized = useRef(false);
  useEffect(() => {
    if (imageLoaded && savedData && !hasDeserialized.current) {
      hasDeserialized.current = true;
      deserialize(savedData);
    }
  }, [imageLoaded, savedData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    await save(serialize());
  }, [save, serialize]);

  const handleDownload = useCallback(() => {
    downloadAnnotated();
  }, [downloadAnnotated]);

  // Clicking a layer row: switch to select tool so objects are interactive, then select the object
  const handleLayerSelect = useCallback((id: string) => {
    setTool("select");
    requestAnimationFrame(() => selectLayerObject(id));
  }, [selectLayerObject]);

  // Unsaved-changes guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = fabricRef.current?.getActiveObject() as any;
      const isEditingText = active?.type === "i-text" && active?.isEditing;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
      }
      if (!isEditingText && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteSelected, fabricRef]);

  return (
    <div className="flex min-h-0" style={{ maxWidth }}>

      {/* ── LEFT: Canvas workspace ────────────────────────────────── */}
      <div className="flex-1 min-w-0 bg-[#f8f7f7] dark:bg-[#131313] flex flex-col">

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 h-9 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Canvas</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize font-medium">{tool}</span>
            {layerList.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {layerList.length} object{layerList.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 tabular-nums">
              {Math.round(currentZoom * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-[11px] text-gray-400">Loading…</span>
              </div>
            )}
            {isError && (
              <span className="text-[11px] text-red-500 font-medium">Failed to load annotations</span>
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 p-6 flex items-start justify-center overflow-auto relative">
          <div className="relative inline-block select-none overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#1c1c1e] w-full">
            {/* Invisible img — stays in DOM for layout sizing and ResizeObserver */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              className="block w-full h-auto invisible"
              draggable={false}
              crossOrigin="anonymous"
              onLoad={() => setImageLoaded(true)}
            />

            {imageLoaded && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{
                  cursor:
                    tool === "select" ? "default"   :
                    tool === "eraser" ? "cell"       :
                    tool === "text"   ? "text"       :
                    "crosshair",
                }}
              />
            )}

            {/* ── Name labels overlay ── */}
            {imageLoaded && layerList.some(l => l.name && l.visible) && (
              <div className="absolute inset-0 pointer-events-none">
                {layerList
                  .filter(l => l.name && l.visible && l.labelPos)
                  .map(l => (
                    <div
                      key={l.id}
                      style={{
                        position:  "absolute",
                        left:      l.labelPos!.x,
                        top:       l.labelPos!.y,
                        transform: "translateX(-50%) translateY(-100%)",
                      }}
                      className="text-[10px] font-semibold text-white bg-black/55 backdrop-blur-sm px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      {l.name}
                    </div>
                  ))
                }
              </div>
            )}

            {/* Active tool badge */}
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-semibold text-white/90 capitalize tracking-wide">{tool}</span>
              </span>
            </div>
          </div>

          {/* ── Zoom controls ─────────────────────────────────────────── */}
          <div className="absolute bottom-5 right-5 z-10 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-sm shadow-md overflow-hidden">
            <button
              onClick={zoomOut}
              title="Zoom out (Ctrl+Scroll)"
              className="px-2.5 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M5 12h14" />
              </svg>
            </button>

            <button
              onClick={resetZoom}
              title="Reset zoom"
              className="px-2.5 py-2 text-[11px] font-mono font-semibold tabular-nums text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[3.5rem] text-center border-x border-gray-100 dark:border-gray-700"
            >
              {Math.round(currentZoom * 100)}%
            </button>

            <button
              onClick={zoomIn}
              title="Zoom in (Ctrl+Scroll)"
              className="px-2.5 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Sidebar ───────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] overflow-y-auto">
        <AnnotationToolbar
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          isDirty={isDirty}
          isSaving={isSaving}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={setTool}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
          onSave={handleSave}
          onClear={clearAll}
          onDelete={deleteSelected}
          onUndo={undo}
          onRedo={redo}
          onDownload={handleDownload}
          layers={layerList}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onToggleVisibility={setLayerVisibility}
          onSelectObject={handleLayerSelect}
          onDeleteObject={deleteById}
          selectedLayer={selectedId ? (layerList.find(l => l.id === selectedId) ?? null) : null}
          onRename={renameObject}
          onSetFillColor={setObjectFillColor}
          onSetFillOpacity={setObjectFillOpacity}
        />
      </div>
    </div>
  );
}
