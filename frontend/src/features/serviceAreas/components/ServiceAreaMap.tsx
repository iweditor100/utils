import React, { useCallback, useRef, useEffect } from "react";
import { GoogleMap, Polygon, Circle } from "@react-google-maps/api";
import { ServiceAreaDTO } from "../types";
import { ServiceAreaDraftOverlay } from "../../../components/service-area/ServiceAreaDraftOverlay";
import { EditorMode } from "../../../components/service-area/ServiceAreaToolbar";
import { CircleDraft } from "../../../components/service-area/hooks/useCircleDraft";
import { PolygonDraft } from "../../../components/service-area/hooks/usePolygonDraft";
import { useDrawingManager } from "../../../components/service-area/hooks/useDrawingManager";

interface ServiceAreaMapProps {
    areas: ServiceAreaDTO[];
    isLoaded: boolean;
    onAreaClick?: (area: ServiceAreaDTO) => void;

    // Editor Props
    mode?: EditorMode;
    draftCircle?: CircleDraft | null;
    draftPolygon?: PolygonDraft | null;
    onMapClick?: (e: google.maps.MapMouseEvent) => void;
    onCircleUpdate?: (updates: Partial<CircleDraft>) => void;
    onPolygonComplete?: (polygon: google.maps.Polygon) => void;
    focusLocation?: { lat: number; lng: number } | null;
}

const containerStyle = {
    width: "100%",
    height: "100%",
};

const defaultCenter = {
    lat: 0,
    lng: 0,
};

/**
 * ServiceAreaMap component using Google Maps to display GeoJSON polygons and circular radius areas.
 * Assumes the Google Maps script is already loaded by a parent.
 */
export const ServiceAreaMap: React.FC<ServiceAreaMapProps> = ({
    areas,
    isLoaded,
    onAreaClick,
    mode = "none",
    draftCircle,
    draftPolygon,
    onMapClick,
    onCircleUpdate,
    onPolygonComplete,
    focusLocation,
}) => {
    const mapRef = useRef<google.maps.Map | null>(null);

    // Re-center map when focusLocation changes
    useEffect(() => {
        if (!mapRef.current || !focusLocation) return;

        mapRef.current.panTo(focusLocation);
        mapRef.current.setZoom(14);
    }, [focusLocation]);

    // Initialize Drawing Manager for polygon mode
    useDrawingManager({
        map: mapRef.current,
        enabled: mode === "draw-polygon",
        onPolygonComplete,
    });

    /**
     * Automatically fits the map bounds to contain all provided service area polygons and circles.
     */
    const fitBounds = useCallback(() => {
        if (!mapRef.current || areas.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        let hasCoords = false;

        areas.forEach((area) => {
            if (area.type === "POLYGON" && area.polygon) {
                area.polygon.coordinates[0].forEach((coord) => {
                    bounds.extend({ lat: coord[1], lng: coord[0] });
                    hasCoords = true;
                });
            }

            if (
                area.type === "RADIUS" &&
                area.longitude !== null &&
                area.latitude !== null &&
                area.radius !== null
            ) {
                const center = new google.maps.LatLng(area.latitude, area.longitude);
                bounds.extend(center);

                const circleBounds = new google.maps.Circle({
                    center,
                    radius: area.radius,
                }).getBounds();

                if (circleBounds) {
                    bounds.union(circleBounds);
                }

                hasCoords = true;
            }
        });

        if (hasCoords) {
            mapRef.current.fitBounds(bounds);
        }
    }, [areas]);

    // Refit bounds when areas load — but not while the user is actively editing
    useEffect(() => {
        if (isLoaded && mapRef.current && mode === "none") {
            fitBounds();
        }
    }, [isLoaded, areas, fitBounds, mode]);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        fitBounds();
    }, [fitBounds]);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    if (!isLoaded) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mr-3"></div>
                Loading Google Maps...
            </div>
        );
    }

    return (
        <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200 shadow-sm relative z-0">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={2}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={onMapClick}
                options={{
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    styles: [
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }],
                        },
                    ],
                }}
            >
                <ServiceAreaDraftOverlay
                    mode={mode}
                    draftCircle={draftCircle || null}
                    draftPolygon={draftPolygon || null}
                    onCircleUpdate={onCircleUpdate}
                />

                {areas.map((area) => {
                    // POLYGON
                    if (area.type === "POLYGON" && area.polygon) {
                        const paths = area.polygon.coordinates[0].map((coord) => ({
                            lat: coord[1],
                            lng: coord[0],
                        }));

                        return (
                            <Polygon
                                key={area.id}
                                path={paths}
                                onClick={() => onAreaClick?.(area)}
                                options={{
                                    fillColor: "#3b82f6",
                                    fillOpacity: 0.2,
                                    strokeColor: "#3b82f6",
                                    strokeWeight: 2,
                                    clickable: true,
                                }}
                            />
                        );
                    }

                    // RADIUS (Circle)
                    if (
                        area.type === "RADIUS" &&
                        area.longitude !== null &&
                        area.latitude !== null &&
                        area.radius !== null
                    ) {
                        return (
                            <Circle
                                key={area.id}
                                center={{ lat: area.latitude, lng: area.longitude }}
                                radius={area.radius}
                                onClick={() => onAreaClick?.(area)}
                                options={{
                                    fillColor: "#10b981",
                                    fillOpacity: 0.2,
                                    strokeColor: "#10b981",
                                    strokeWeight: 2,
                                    clickable: true,
                                }}
                            />
                        );
                    }

                    return null;
                })}
            </GoogleMap>
        </div>
    );
};
