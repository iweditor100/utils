import { z } from "zod";

export const createServiceAreaSchema = z.object({
    name: z.string(),

    polygon: z.any().optional(),

    longitude: z.number().optional(),
    latitude: z.number().optional(),
    radius: z.number().optional(),
}).refine(data => {
    if (data.polygon) return true;
    if (
        data.longitude !== undefined &&
        data.latitude !== undefined &&
        data.radius !== undefined
    ) return true;

    return false;
}, {
    message: "Provide either polygon OR longitude + latitude + radius"
});


export const checkServiceAreaSchema = z.object({
    longitude: z.number(),
    latitude: z.number(),
})