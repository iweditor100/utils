import { useState } from "react";
import type { LayerItem } from "../types";

const TYPE_LABELS: Record<string, string> = {
  rect:       "Rectangle",
  circle:     "Ellipse",
  line:       "Line",
  dottedline: "Dotted Line",
  text:       "Text",
  pin:        "Pin",
  freedraw:   "Freedraw",
  polygon:    "Polygon",
};

// Small SVG icon per type
function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "rect":       return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="1.5" y="3.5" width="13" height="9" rx="1"/></svg>;
    case "circle":     return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><ellipse cx="8" cy="8" rx="6" ry="4"/></svg>;
    case "line":       return <svg className="w-3 h-3" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6}><line x1="2" y1="14" x2="14" y2="2" strokeLinecap="round"/></svg>;
    case "dottedline": return <svg className="w-3 h-3" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeDasharray="2.5 2.5"><line x1="2" y1="14" x2="14" y2="2" strokeLinecap="round"/></svg>;
    case "text":       return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" d="M4 4h8M8 4v8M6 12h4"/></svg>;
    case "pin":        return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" d="M8 14S3 9 3 6a5 5 0 0110 0c0 3-5 8-5 8z"/><circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none"/></svg>;
    case "freedraw":   return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M2 12c2-4 4-8 6-8s2 4 4 4 2-2 2-2"/></svg>;
    case "polygon":    return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8 2l6 4-2 6H4L2 6z"/></svg>;
    default:           return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="8" cy="8" r="5"/></svg>;
  }
}

interface Props {
  layers: LayerItem[];
  onBringForward:      (id: string) => void;
  onSendBackward:      (id: string) => void;
  onBringToFront:      (id: string) => void;
  onSendToBack:        (id: string) => void;
  onToggleVisibility:  (id: string, visible: boolean) => void;
  onSelectObject:      (id: string) => void;
  onDeleteObject:      (id: string) => void;
}

export function AnnotationLayers({
  layers,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onToggleVisibility,
  onSelectObject,
  onDeleteObject,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border-t border-gray-100 dark:border-gray-800">

      {/* ── Header ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Layers
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {layers.length}
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${collapsed ? "" : "rotate-180"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* ── Layer list ── */}
      {!collapsed && (
        <div className="flex flex-col max-h-52 overflow-y-auto pb-2">
          {layers.length === 0 ? (
            <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 py-5 px-4">
              No annotations yet.<br />
              <span className="text-gray-300 dark:text-gray-700">Pick a tool and start drawing.</span>
            </p>
          ) : (
            layers.map((layer, idx) => {
              const isTop    = idx === 0;
              const isBottom = idx === layers.length - 1;

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectObject(layer.id)}
                  className={`
                    group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors
                    hover:bg-gray-50 dark:hover:bg-gray-800/50
                    ${!layer.visible ? "opacity-40" : ""}
                  `}
                >
                  {/* Color swatch */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: layer.color }}
                  />

                  {/* Type icon */}
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">
                    <TypeIcon type={layer.type} />
                  </span>

                  {/* Label */}
                  <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium flex-1 truncate">
                    {layer.name || (TYPE_LABELS[layer.type] ?? layer.type)}
                  </span>

                  {/* Z-index badge */}
                  <span className="text-[9px] font-mono text-gray-300 dark:text-gray-700 tabular-nums shrink-0">
                    {layer.zIndex}
                  </span>

                  {/* Action buttons — appear on row hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">

                    {/* Move up */}
                    <button
                      onClick={e => { e.stopPropagation(); onBringForward(layer.id); }}
                      disabled={isTop}
                      title="Bring forward"
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>

                    {/* Move down */}
                    <button
                      onClick={e => { e.stopPropagation(); onSendBackward(layer.id); }}
                      disabled={isBottom}
                      title="Send backward"
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Visibility toggle */}
                    <button
                      onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id, !layer.visible); }}
                      title={layer.visible ? "Hide" : "Show"}
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {layer.visible ? (
                        <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
                        </svg>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteObject(layer.id); }}
                      title="Delete"
                      className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <svg className="w-3 h-3 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Bring-to-front / Send-to-back shortcuts ── */}
      {!collapsed && layers.length > 1 && (
        <div className="flex gap-1 px-3 pb-3">
          <button
            onClick={() => { const top = layers[0]; if (top) onBringToFront(top.id); }}
            title="Bring selected to front"
            className="flex-1 py-1 text-[10px] text-gray-400 dark:text-gray-600 border border-gray-100 dark:border-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            To Front
          </button>
          <button
            onClick={() => { const bot = layers[layers.length - 1]; if (bot) onSendToBack(bot.id); }}
            title="Send selected to back"
            className="flex-1 py-1 text-[10px] text-gray-400 dark:text-gray-600 border border-gray-100 dark:border-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            To Back
          </button>
        </div>
      )}
    </div>
  );
}
