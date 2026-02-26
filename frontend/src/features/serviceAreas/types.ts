export type PolygonGeoJSON = {
    type: "Polygon";
    coordinates: number[][][];
};

export interface ServiceAreaDTO {
    id: string;
    userId: string;
    name: string;
    type: "POLYGON" | "RADIUS";
    createdAt: string;
    updatedAt: string;

    polygon: PolygonGeoJSON | null;

    longitude: number | null;
    latitude: number | null;
    radius: number | null;
}

export type CreateServiceAreaInput = {
    name: string;
    type: "POLYGON" | "RADIUS";
    polygon?: PolygonGeoJSON;
    longitude?: number;
    latitude?: number;
    radius?: number;
};

export type ServiceAreaResponse = ServiceAreaDTO[];
