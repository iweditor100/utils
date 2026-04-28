export type AnnotationTool = "select" | "pin" | "rect" | "circle" | "line" | "dottedline" | "text" | "freedraw" | "eraser" | "polygon";

// Fields shared by every annotation object for layer management
type LayerFields = {
  zIndex?:  number;   // position in z-stack (0 = bottom); undefined → preserve array order
  visible?: boolean;  // false = hidden in canvas, still stored in JSON; default true
  name?:    string;   // user-assigned label shown on canvas
};

export type RectAnnotation = LayerFields & {
  id: string; type: "rect";
  x: number; y: number; w: number; h: number;
  color: string; strokeWidth: number;
  fillColor?: string;
  fillOpacity?: number; // 0–1
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
  fillColor?: string;
  fillOpacity?: number; // 0–1
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
  fillColor?: string;
  fillOpacity?: number; // 0–1
};

export type AnnotationObject =
  | RectAnnotation | PinAnnotation | FreeDrawAnnotation
  | CircleAnnotation | LineAnnotation | DottedLineAnnotation
  | TextAnnotation | PolygonAnnotation;

export type AnnotationData = {
  objects: AnnotationObject[];
};

export type AnnotationRecord = {
  id: string; uploadId: string; userId: string;
  data: AnnotationData;
  version: number; createdAt: string; updatedAt: string;
};

// Used by the layer panel — derived from the live canvas, not the JSON
export type LayerItem = {
  id: string;
  type: string;     // annotationType string ("rect", "pin", etc.)
  color: string;    // display color for the swatch
  visible: boolean;
  zIndex: number;   // current index in canvas stack (0 = bottom)
  name?: string;
  fillColor?: string;
  fillOpacity?: number; // 0–1
  labelPos?: { x: number; y: number }; // canvas-relative px position for the name label
};
