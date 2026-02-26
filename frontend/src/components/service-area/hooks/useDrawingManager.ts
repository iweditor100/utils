import { useEffect, useRef, useCallback } from "react";

interface UseDrawingManagerProps {
    map: google.maps.Map | null;
    enabled: boolean;
    onPolygonComplete?: (polygon: google.maps.Polygon) => void;
}

export const useDrawingManager = ({ map, enabled, onPolygonComplete }: UseDrawingManagerProps) => {
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    const cleanup = useCallback(() => {
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setMap(null);
            google.maps.event.clearInstanceListeners(drawingManagerRef.current);
            drawingManagerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!map || !enabled) {
            cleanup();
            return;
        }

        const drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: false, // We use our own toolbar
            polygonOptions: {
                fillColor: "#3b82f6",
                fillOpacity: 0.2,
                strokeColor: "#3b82f6",
                strokeWeight: 2,
                clickable: true,
                editable: false,
                zIndex: 1,
            },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        const listener = google.maps.event.addListener(
            drawingManager,
            "polygoncomplete",
            (polygon: google.maps.Polygon) => {
                onPolygonComplete?.(polygon);
                // After completion, we often want to disable drawing mode
                drawingManager.setDrawingMode(null);
            }
        );

        return () => {
            google.maps.event.removeListener(listener);
            cleanup();
        };
    }, [map, enabled, onPolygonComplete, cleanup]);

    return drawingManagerRef;
};
