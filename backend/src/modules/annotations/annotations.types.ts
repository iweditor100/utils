type LayerFields = {
    zIndex?:  number;
    visible?: boolean;
};

export type RectAnnotation = LayerFields & {
    id: string; type: "rect";
    x: number; y: number; w: number; h: number;
    color: string; strokeWidth: number;
};

export type PinAnnotation = LayerFields & {
    id: string; type: "pin";
    x: number; y: number;
    color: string; size: number; label?: string;
};

export type FreeDrawAnnotation = LayerFields & {
    id: string; type: "freedraw";
    path: (string | number)[][];
    refW: number; refH: number;
    left: number; top: number;
    color: string; strokeWidth: number;
};

export type CircleAnnotation = LayerFields & {
    id: string; type: "circle";
    cx: number; cy: number; rx: number; ry: number;
    color: string; strokeWidth: number;
};

export type LineAnnotation = LayerFields & {
    id: string; type: "line";
    x1: number; y1: number; x2: number; y2: number;
    color: string; strokeWidth: number;
};

export type DottedLineAnnotation = LayerFields & {
    id: string; type: "dottedline";
    x1: number; y1: number; x2: number; y2: number;
    color: string; strokeWidth: number;
};

export type TextAnnotation = LayerFields & {
    id: string; type: "text";
    x: number; y: number;
    text: string; fontSize: number; color: string;
};

export type PolygonAnnotation = LayerFields & {
    id: string; type: "polygon";
    points: { x: number; y: number }[];
    color: string; strokeWidth: number;
};

export type AnnotationObject =
    | RectAnnotation | PinAnnotation | FreeDrawAnnotation
    | CircleAnnotation | LineAnnotation | DottedLineAnnotation
    | TextAnnotation | PolygonAnnotation;

export type AnnotationData = {
    objects: AnnotationObject[];
};
