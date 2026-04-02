import type { AnnotationTool } from "../types";

interface ToolDef {
  value: AnnotationTool;
  label: string;
  title: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  {
    value: "select",
    label: "Select",
    title: "Select and move objects",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l4.5 13 3-4.5 4.5-3L4 4z" />
      </svg>
    ),
  },
  {
    value: "freedraw",
    label: "Pen",
    title: "Freehand drawing",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
        <path strokeLinecap="round" d="M3 21h4" />
      </svg>
    ),
  },
  {
    value: "rect",
    label: "Rectangle",
    title: "Draw a rectangle",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="6" width="18" height="12" rx="1.5" />
      </svg>
    ),
  },
  {
    value: "circle",
    label: "Ellipse",
    title: "Draw an ellipse",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <ellipse cx="12" cy="12" rx="9" ry="6" />
      </svg>
    ),
  },
  {
    value: "line",
    label: "Line",
    title: "Draw a straight line",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" d="M4 20L20 4" />
      </svg>
    ),
  },
  {
    value: "dottedline",
    label: "Dotted",
    title: "Draw a dotted line",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeDasharray="3 3" d="M4 20L20 4" />
      </svg>
    ),
  },
  {
    value: "text",
    label: "Text",
    title: "Add a text label",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M12 7v13M9 20h6" />
      </svg>
    ),
  },
  {
    value: "pin",
    label: "Pin",
    title: "Drop a pin marker",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21C12 21 6 14.5 6 9a6 6 0 0112 0c0 5.5-6 12-6 12z" />
        <circle cx="12" cy="9" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    value: "polygon",
    label: "Polygon",
    title: "Click to place points. Click first point or double-click to close.",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 6-3 9H7L4 9z" />
      </svg>
    ),
  },
  {
    value: "eraser",
    label: "Eraser",
    title: "Click an object to erase it",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 20H9L3 14l11-11 7 7-3.5 3.5" />
        <path strokeLinecap="round" d="M7 17l3.5-3.5" />
      </svg>
    ),
  },
];

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6",
  "#111827", "#ffffff",
];

interface Props {
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (t: AnnotationTool) => void;
  onColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onSave: () => void;
  onClear: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
}

export function AnnotationToolbar({
  tool,
  color,
  strokeWidth,
  isDirty,
  isSaving,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onSave,
  onClear,
  onDelete,
  onUndo,
  onRedo,
  onDownload,
}: Props) {
  return (
    <div className="w-56 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] overflow-y-auto">

      {/* ── Section: History (Undo / Redo) ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">
          History
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="
              flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
              text-xs font-medium transition-all
              disabled:opacity-35 disabled:cursor-not-allowed
              text-gray-600 dark:text-gray-400
              bg-gray-50 dark:bg-gray-800/60
              border border-gray-100 dark:border-gray-800
              hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-800
              hover:enabled:text-gray-800 dark:hover:enabled:text-gray-200
            "
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="
              flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
              text-xs font-medium transition-all
              disabled:opacity-35 disabled:cursor-not-allowed
              text-gray-600 dark:text-gray-400
              bg-gray-50 dark:bg-gray-800/60
              border border-gray-100 dark:border-gray-800
              hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-800
              hover:enabled:text-gray-800 dark:hover:enabled:text-gray-200
            "
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
            Redo
          </button>
        </div>
      </div>

      {/* ── Section: Tools ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
          Drawing Tools
        </p>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map((t) => {
            const active = tool === t.value;
            return (
              <button
                key={t.value}
                onClick={() => onToolChange(t.value)}
                title={t.title}
                className={`
                  flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium
                  transition-all duration-100 text-left
                  ${active
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
                  }
                `}
              >
                <span className={`shrink-0 ${active ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>
                  {t.icon}
                </span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section: Appearance ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
          Appearance
        </p>

        {/* Color */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Color</span>
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <span
                className="w-5 h-5 rounded border border-gray-200 dark:border-gray-700 shadow-sm group-hover:ring-2 group-hover:ring-red-200 dark:group-hover:ring-red-900 transition-all"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 uppercase">
                {color}
              </span>
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>

          {/* Preset swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                title={c}
                className={`
                  w-5 h-5 rounded-full transition-all border
                  ${color === c
                    ? "ring-2 ring-offset-1 ring-red-400 scale-110 border-transparent"
                    : "border-gray-200 dark:border-gray-700 hover:scale-110"
                  }
                  ${c === "#ffffff" ? "border-gray-200 dark:border-gray-600" : "border-transparent"}
                `}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Stroke width */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Stroke</span>
            <span className="text-xs font-semibold font-mono text-red-500 tabular-nums">
              {strokeWidth}px
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="
              w-full h-1 appearance-none rounded-full cursor-pointer
              bg-gray-100 dark:bg-gray-800
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-red-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-sm
            "
          />
          <div className="flex justify-between text-[9px] text-gray-300 dark:text-gray-700">
            <span>Thin</span>
            <span>Thick</span>
          </div>
        </div>
      </div>

      {/* ── Section: Actions ── */}
      <div className="px-4 pt-4 pb-4 flex flex-col gap-2 mt-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-1">
          Actions
        </p>

        <button
          onClick={onDelete}
          title="Delete selected objects"
          className="
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
            text-gray-500 dark:text-gray-400
            bg-gray-50 dark:bg-gray-800/60
            border border-gray-100 dark:border-gray-800
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200
            transition-colors
          "
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Delete Selected
        </button>

        <button
          onClick={onClear}
          title="Clear all annotations"
          className="
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
            text-red-500 dark:text-red-400
            bg-red-50 dark:bg-red-950/30
            border border-red-100 dark:border-red-900/50
            hover:bg-red-100 dark:hover:bg-red-950/60
            transition-colors
          "
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear All
        </button>

        <button
          onClick={onDownload}
          title="Download annotated image as PNG"
          className="
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
            text-gray-500 dark:text-gray-400
            bg-gray-50 dark:bg-gray-800/60
            border border-gray-100 dark:border-gray-800
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200
            transition-colors
          "
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download PNG
        </button>

        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />

        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="
            w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
            text-xs font-semibold text-white
            bg-red-500 hover:bg-red-600
            disabled:opacity-40 disabled:cursor-not-allowed
            shadow-sm hover:shadow-md transition-all active:scale-[0.98]
          "
        >
          {isSaving ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving…
            </>
          ) : isDirty ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Save Changes
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              All Saved
            </>
          )}
        </button>
      </div>
    </div>
  );
}
