import React from "react";
import { Circle, Marker, Polygon } from "@react-google-maps/api";
import { CircleDraft } from "./hooks/useCircleDraft";
import { PolygonDraft } from "./hooks/usePolygonDraft";

interface ServiceAreaDraftOverlayProps {
    mode: "none" | "search-circle" | "drop-pin" | "draw-polygon";
    draftCircle: CircleDraft | null;
    draftPolygon: PolygonDraft | null;
    onCircleUpdate?: (updates: Partial<CircleDraft>) => void;
}

// Defined outside component so references are stable — prevents Circle/Polygon
// from calling setOptions on every render, which was overriding setCenter
const circleOptions = {
    fillColor: "#3b82f6",
    fillOpacity: 0.2,
    strokeColor: "#3b82f6",
    strokeWeight: 2,
    clickable: false,
    editable: false,
    zIndex: 10,
};

const polygonOptions = {
    fillColor: "#3b82f6",
    fillOpacity: 0.2,
    strokeColor: "#3b82f6",
    strokeWeight: 2,
    clickable: false,
    editable: false,
    zIndex: 10,
};

export const ServiceAreaDraftOverlay: React.FC<ServiceAreaDraftOverlayProps> = ({
    mode,
    draftCircle,
    draftPolygon,
    onCircleUpdate,
}) => {

    if (mode === "search-circle" || mode === "drop-pin") {
        if (!draftCircle) return null;

        return (
            <>
                <Marker
                    position={{ lat: draftCircle.lat, lng: draftCircle.lng }}
                    draggable={mode === "drop-pin"}
                    onDragEnd={(e) => {
                        if (e.latLng) {
                            onCircleUpdate?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                        }
                    }}
                    onUnmount={(marker) => marker.setMap(null)}
                />
                <Circle
                    center={{ lat: draftCircle.lat, lng: draftCircle.lng }}
                    radius={draftCircle.radius}
                    options={circleOptions}
                    onUnmount={(circle) => circle.setMap(null)}
                />
            </>
        );
    }

    if (mode === "draw-polygon") {
        if (!draftPolygon) return null;

        // Convert GeoJSON coords back to Google LatLng objects for rendering
        const paths = draftPolygon.coordinates[0].map((coord) => ({
            lng: coord[0],
            lat: coord[1],
        }));

        return <Polygon paths={paths} options={polygonOptions} />;
    }

    return null;
};
