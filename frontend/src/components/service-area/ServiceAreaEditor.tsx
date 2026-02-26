import React from "react";
import { ServiceAreaSearch } from "../form/form-elements/ServiceAreaSearch";
import { CircleDraft } from "./hooks/useCircleDraft";
import { EditorMode } from "./ServiceAreaToolbar";

interface ServiceAreaEditorProps {
    mode: EditorMode;
    draftCircle: CircleDraft | null;
    onCircleUpdate: (updates: Partial<CircleDraft>) => void;
    onPlaceSelected: (lat: number, lng: number) => void;
    isLoaded: boolean;
}

export const ServiceAreaEditor: React.FC<ServiceAreaEditorProps> = ({
    mode,
    draftCircle,
    onCircleUpdate,
    onPlaceSelected,
    isLoaded,
}) => {
    if (mode === "none") return null;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 animate-in slide-in-from-top-1 duration-200">
            {mode === "search-circle" && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        1. Search for a location
                    </h3>
                    <ServiceAreaSearch
                        isLoaded={isLoaded}
                        onLocationSelect={onPlaceSelected}
                    />
                </div>
            )}

            {(mode === "search-circle" || mode === "drop-pin") && draftCircle && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Service Radius: <span className="font-bold text-blue-600">{(draftCircle.radius / 1000).toFixed(1)} km</span>
                        </label>
                    </div>
                    <input
                        type="range"
                        min="100"
                        max="50000"
                        step="100"
                        value={draftCircle.radius}
                        onChange={(e) => onCircleUpdate({ radius: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>0.1 km</span>
                        <span>50 km</span>
                    </div>
                </div>
            )}

            {mode === "draw-polygon" && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Drawing Mode Active
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Click on the map to start drawing your service area. Click the first point or double click to close the polygon.
                    </p>
                </div>
            )}

            {mode === "drop-pin" && !draftCircle && (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    Click anywhere on the map to drop a pin and start defining your service area.
                </div>
            )}
        </div>
    );
};
