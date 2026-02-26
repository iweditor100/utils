import React from "react";

export type EditorMode = "none" | "search-circle" | "drop-pin" | "draw-polygon";

interface ServiceAreaToolbarProps {
    mode: EditorMode;
    onModeChange: (mode: EditorMode) => void;
    onSave: () => void;
    onCancel: () => void;
    canSave: boolean;
    isSaving: boolean;
}

export const ServiceAreaToolbar: React.FC<ServiceAreaToolbarProps> = ({
    mode,
    onModeChange,
    onSave,
    onCancel,
    canSave,
    isSaving,
}) => {
    const isEditing = mode !== "none";

    const buttonClass = (active: boolean) =>
        `px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm flex items-center gap-2 ${active
            ? "bg-blue-600 text-white"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`;

    return (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
            {!isEditing ? (
                <>
                    <button
                        onClick={() => onModeChange("search-circle")}
                        className={buttonClass(false)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Add via Search
                    </button>
                    <button
                        onClick={() => onModeChange("drop-pin")}
                        className={buttonClass(false)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        Drop Pin
                    </button>
                    <button
                        onClick={() => onModeChange("draw-polygon")}
                        className={buttonClass(false)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Draw Polygon
                    </button>
                </>
            ) : (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mr-2">
                        {mode.replace("-", " ")} mode
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!canSave || isSaving}
                        className={`px-6 py-2 rounded-md text-sm font-bold text-white transition-all shadow-md ${canSave && !isSaving
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500"
                            }`}
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </div>
                        ) : (
                            "Add Service Area"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
