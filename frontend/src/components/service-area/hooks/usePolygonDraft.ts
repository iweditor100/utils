import { useState, useCallback } from "react";

export interface PolygonDraft {
    type: "Polygon";
    coordinates: number[][][]; // GeoJSON format: [[[lng, lat], ...]]
}

export const usePolygonDraft = () => {
    const [draft, setDraft] = useState<PolygonDraft | null>(null);

    const setFromGooglePath = useCallback((path: google.maps.LatLng[]) => {
        if (path.length < 3) {
            setDraft(null);
            return;
        }

        // Convert Google LatLng objects to GeoJSON [lng, lat] arrays
        const coords = path.map((point) => [point.lng(), point.lat()]);

        // Close the polygon by adding the first point to the end if it's not already there
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push([...first]);
        }

        setDraft({
            type: "Polygon",
            coordinates: [coords],
        });
    }, []);

    const clearDraft = useCallback(() => {
        setDraft(null);
    }, []);

    const isValid = draft !== null && draft.coordinates[0].length >= 4; // 3 points + 1 for closure

    return {
        draft,
        setFromGooglePath,
        clearDraft,
        isValid,
    };
};
