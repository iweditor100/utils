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

  const { serialize, deserialize, clearAll, deleteSelected, undo, redo, canUndo, canRedo, downloadAnnotated } = useFabricCanvas(
    canvasRef,
    imgRef,
    tool,
    color,
    strokeWidth,
    imageLoaded,
    markDirty,
  );

  useEffect(() => {
    if (imageLoaded && savedData) {
      deserialize(savedData);
    }
  }, [imageLoaded, savedData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    await save(serialize());
  }, [save, serialize]);

  const handleDownload = useCallback(() => {
    if (imgRef.current) downloadAnnotated(imgRef.current);
  }, [downloadAnnotated]);

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="flex min-h-0" style={{ maxWidth }}>

      {/* ── LEFT: Canvas workspace ────────────────────────────────── */}
      <div className="flex-1 min-w-0 bg-[#f8f7f7] dark:bg-[#131313] flex flex-col">

        {/* Workspace status bar */}
        <div className="flex items-center justify-between px-5 h-9 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              Canvas
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize font-medium">
              {tool}
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
        <div className="flex-1 p-6 flex items-start justify-center overflow-auto">
          <div className="relative inline-block w-full select-none overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#1c1c1e]">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Annotatable image"
              className="block w-full h-auto"
              draggable={false}
              crossOrigin="anonymous"
              onLoad={() => setImageLoaded(true)}
            />

            {imageLoaded && (
              <canvas
                ref={canvasRef}
                style={{
                  cursor:
                    tool === "select"  ? "default"  :
                    tool === "eraser"  ? "cell"      :
                    tool === "text"    ? "text"      :
                    "crosshair",
                }}
              />
            )}

            {/* Active tool badge */}
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-semibold text-white/90 capitalize tracking-wide">
                  {tool}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Tools panel ───────────────────────────────────── */}
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
      />
    </div>
  );
}
