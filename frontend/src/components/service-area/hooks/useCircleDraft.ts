import { useState, useCallback } from "react";

export interface CircleDraft {
    lat: number;
    lng: number;
    radius: number; // in meters
}

export const useCircleDraft = () => {
    const [draft, setDraft] = useState<CircleDraft | null>(null);

    const updateDraft = useCallback((updates: Partial<CircleDraft>) => {
        setDraft((prev) => {
            if (!prev && updates.lat !== undefined && updates.lng !== undefined) {
                return {
                    lat: updates.lat,
                    lng: updates.lng,
                    radius: updates.radius ?? 1000,
                };
            }
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    }, []);

    const clearDraft = useCallback(() => {
        setDraft(null);
    }, []);

    const isValid = draft !== null && draft.radius > 0;

    return {
        draft,
        updateDraft,
        clearDraft,
        isValid,
    };
};
