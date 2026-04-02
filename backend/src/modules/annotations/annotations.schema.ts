import { z } from "zod";

export const annotationObjectSchema = z.discriminatedUnion("type", [
    z.object({
        id: z.string().uuid(),
        type: z.literal("rect"),
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        w: z.number().min(0).max(1),
        h: z.number().min(0).max(1),
        color: z.string(),
        strokeWidth: z.number().positive(),
    }),
    z.object({
        id: z.string().uuid(),
        type: z.literal("pin"),
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        color: z.string(),
        label: z.string().optional(),
    }),
    z.object({
        id: z.string().uuid(),
        type: z.literal("freedraw"),
        path: z.array(z.array(z.union([z.string(), z.number()]))),
        refW: z.number().positive(),
        refH: z.number().positive(),
        left: z.number(),
        top: z.number(),
        color: z.string(),
        strokeWidth: z.number().positive(),
    }),
    z.object({
        id: z.string().uuid(),
        type: z.literal("circle"),
        cx: z.number(),
        cy: z.number(),
        rx: z.number().nonnegative(),
        ry: z.number().nonnegative(),
        color: z.string(),
        strokeWidth: z.number().positive(),
    }),
    z.object({
        id: z.string().uuid(),
        type: z.literal("line"),
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number(),
        color: z.string(),
        strokeWidth: z.number().positive(),
    }),
    z.object({
        id: z.string().uuid(),
        type: z.literal("text"),
        x: z.number(),
        y: z.number(),
        text: z.string(),
        fontSize: z.number().positive(),
        color: z.string(),
    }),
    z.object({
        id: z.string().uuid(),
        type: z.literal("polygon"),
        points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
        color: z.string(),
        strokeWidth: z.number().positive(),
    }),
]);



export const saveAnnotationSchema = z.object({
    uploadId: z.string().uuid(),
    data: z.object({
        objects: z.array(annotationObjectSchema).max(500),
    }),
})

export const uploadIdParamSchema = z.object({
    uploadId: z.string().uuid(),
})

export type SaveAnnotationRequest = z.infer<typeof saveAnnotationSchema>;
export type UploadIdParam = z.infer<typeof uploadIdParamSchema>;