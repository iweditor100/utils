import { z } from "zod";

// Shared field constraints
const color       = z.string().max(50);
const strokeWidth = z.number().positive().max(100);
const coordNorm   = z.number().min(-1).max(2);
const coordPx     = z.number().finite();
const layerFields = {
    zIndex:  z.number().int().min(0).max(499).optional(),
    visible: z.boolean().optional(),
};

export const annotationObjectSchema = z.discriminatedUnion("type", [
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("rect"),
        x: z.number().min(0).max(1), y: z.number().min(0).max(1),
        w: z.number().min(0).max(1), h: z.number().min(0).max(1),
        color, strokeWidth,
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("pin"),
        x: z.number().min(0).max(1), y: z.number().min(0).max(1),
        color, size: z.number().positive().max(50),
        label: z.string().max(200).optional(),
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("freedraw"),
        path: z.array(
            z.array(z.union([z.string().max(2), z.number().finite()])).max(8)
        ).max(3000),
        refW: z.number().positive().max(20000),
        refH: z.number().positive().max(20000),
        left: coordNorm, top: coordNorm,
        color, strokeWidth,
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("circle"),
        cx: coordNorm, cy: coordNorm,
        rx: z.number().nonnegative().max(5),
        ry: z.number().nonnegative().max(5),
        color, strokeWidth,
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("line"),
        x1: coordPx, y1: coordPx, x2: coordPx, y2: coordPx,
        color, strokeWidth,
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("dottedline"),
        x1: coordPx, y1: coordPx, x2: coordPx, y2: coordPx,
        color, strokeWidth,
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("text"),
        x: coordNorm, y: coordNorm,
        text: z.string().min(1).max(1000),
        fontSize: z.number().positive().max(500),
        color,
    }),
    z.object({
        ...layerFields,
        id: z.string().uuid(), type: z.literal("polygon"),
        points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).min(3).max(500),
        color, strokeWidth,
    }),
]);

export const saveAnnotationSchema = z.object({
    uploadId: z.string().uuid(),
    data: z.object({
        objects: z.array(annotationObjectSchema).max(500),
    }),
});

export const uploadIdParamSchema = z.object({
    uploadId: z.string().uuid(),
});

export type SaveAnnotationRequest = z.infer<typeof saveAnnotationSchema>;
export type UploadIdParam = z.infer<typeof uploadIdParamSchema>;
