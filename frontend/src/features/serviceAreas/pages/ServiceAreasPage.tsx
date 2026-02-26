import React, { useState, useCallback } from "react";
import { useLoadScript } from "@react-google-maps/api";
import {
    useGetServiceAreasQuery,
    useDeleteServiceAreaMutation,
    useCreateServiceAreaMutation
} from "../serviceAreaApi";
import { ServiceAreaMap } from "../components/ServiceAreaMap";
import { ServiceAreaDTO, CreateServiceAreaInput } from "../types";
import { ServiceAreaToolbar, EditorMode } from "../../../components/service-area/ServiceAreaToolbar";
import { ServiceAreaEditor } from "../../../components/service-area/ServiceAreaEditor";
import { useCircleDraft } from "../../../components/service-area/hooks/useCircleDraft";
import { usePolygonDraft } from "../../../components/service-area/hooks/usePolygonDraft";
import { QuickServiceCheck } from "../../../components/service-area/QuickServiceCheck";

const libraries: any[] = ["places", "drawing"];

export const ServiceAreasPage: React.FC = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const [mapFocusLocation, setMapFocusLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(null);

    const { data: response, isLoading: isQueryLoading, error: queryError } = useGetServiceAreasQuery();
    const [createArea, { isLoading: isCreating }] = useCreateServiceAreaMutation();
    const [deleteArea] = useDeleteServiceAreaMutation();

    // Editor State
    const [mode, setMode] = useState<EditorMode>("none");
    const { draft: draftCircle, updateDraft: updateCircle, clearDraft: clearCircle, isValid: isCircleValid } = useCircleDraft();
    const { draft: draftPolygon, setFromGooglePath, clearDraft: clearPolygon, isValid: isPolygonValid } = usePolygonDraft();

    const areas = response?.data || [];

    const handleModeChange = useCallback((newMode: EditorMode) => {
        setMode(newMode);
        clearCircle();
        clearPolygon();
    }, [clearCircle, clearPolygon]);

    const handleCancel = useCallback(() => {
        setMode("none");
        clearCircle();
        clearPolygon();
    }, [clearCircle, clearPolygon]);

    const handleSave = async () => {
        const name = window.prompt("Enter a name for this service area:");
        if (!name) return;

        try {
            let payload: CreateServiceAreaInput;

            if (mode === "draw-polygon" && draftPolygon) {
                payload = {
                    name,
                    type: "POLYGON",
                    polygon: draftPolygon,
                };
            } else if ((mode === "search-circle" || mode === "drop-pin") && draftCircle) {
                payload = {
                    name,
                    type: "RADIUS",
                    longitude: draftCircle.lng,
                    latitude: draftCircle.lat,
                    radius: draftCircle.radius,
                };
            } else {
                return;
            }

            await createArea(payload).unwrap();
            handleCancel();
        } catch (err) {
            console.error("Failed to save service area:", err);
            alert("Error saving service area. Please try again.");
        }
    };

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (mode === "drop-pin" && e.latLng) {
            updateCircle({
                lat: e.latLng.lat(),
                lng: e.latLng.lng(),
                radius: 1000,
            });
        }
    }, [mode, updateCircle]);

    const onPolygonComplete = useCallback((polygon: google.maps.Polygon) => {
        const path = polygon.getPath().getArray();
        setFromGooglePath(path);
        // Remove the drawn polygon from map since we'll render it via draftOverlay
        polygon.setMap(null);
    }, [setFromGooglePath]);

    const onPlaceSelected = useCallback((lat: number, lng: number) => {
        updateCircle({ lat, lng, radius: 1000 });
        setMapFocusLocation({ lat, lng });
    }, [updateCircle]);

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this service area?")) {
            try {
                await deleteArea(id).unwrap();
            } catch (err) {
                console.error("Failed to delete area:", err);
            }
        }
    };

    if (loadError) {
        return <div className="p-8 text-red-500">Error loading Google Maps. Verify your API Key.</div>;
    }

    if (!isLoaded || (isQueryLoading && areas.length === 0)) {
        return (
            <div className="p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 font-medium text-gray-500">Initializing System...</span>
            </div>
        );
    }

    const canSave = (mode === "draw-polygon" && isPolygonValid) ||
        ((mode === "search-circle" || mode === "drop-pin") && isCircleValid);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-white dark:bg-[#0f172a] min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Service Areas
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Define and manage your delivery zones and coverage areas.
                    </p>
                </div>
            </header>

            <ServiceAreaToolbar
                mode={mode}
                onModeChange={handleModeChange}
                onSave={handleSave}
                onCancel={handleCancel}
                canSave={canSave}
                isSaving={isCreating}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <main className="lg:col-span-8 space-y-4">
                    {mode === "none" && (
                        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <QuickServiceCheck
                                isLoaded={isLoaded}
                                onLocationFocus={(lat, lng) => setMapFocusLocation({ lat, lng })}
                            />
                        </div>
                    )}

                    <ServiceAreaEditor
                        mode={mode}
                        draftCircle={draftCircle}
                        onCircleUpdate={updateCircle}
                        onPlaceSelected={onPlaceSelected}
                        isLoaded={isLoaded}
                    />

                    <div className="relative h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 ring-1 ring-black/5">
                        <ServiceAreaMap
                            areas={areas}
                            isLoaded={isLoaded}
                            mode={mode}
                            draftCircle={draftCircle}
                            draftPolygon={draftPolygon}
                            onMapClick={onMapClick}
                            onCircleUpdate={updateCircle}
                            onPolygonComplete={onPolygonComplete}
                            onAreaClick={(area) => console.log("Clicked area:", area.name)}
                            focusLocation={mapFocusLocation}
                        />
                    </div>
                </main>

                <aside className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
                                Service Areas
                            </h2>
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {areas.length} Total
                            </span>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                            {areas.length === 0 ? (
                                <div className="p-10 text-center space-y-2">
                                    <div className="text-4xl">📍</div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No service areas defined yet.</p>
                                </div>
                            ) : (
                                areas.map((area: ServiceAreaDTO) => (
                                    <div key={area.id} className="p-4 flex justify-between items-center group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-bold text-gray-900 dark:text-white truncate text-sm">{area.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-2 h-2 rounded-full ${area.type === 'POLYGON' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                                                    {area.type} • {new Date(area.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(area.id)}
                                            className="text-gray-300 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-xl transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 md:opacity-0 md:group-hover:opacity-100"
                                            title="Delete Area"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
