import { getPrisma } from "../../prisma/client";


const prisma = getPrisma();


export type PolygonGeoJSON = {
    type: "Polygon",
    coordinates: number[][][];
}


class ServiceAreaService {


    // some ensurities: 
    private normalizePolygon(polygon: PolygonGeoJSON): PolygonGeoJSON {

        const ring = polygon.coordinates[0];

        if (!ring || ring.length < 4) {
            throw new Error("Polygon must have at least 4 coordinates (including closure).");
        }


        const first = ring[0];
        const last = ring[ring.length - 1];


        const isClosed = first[0] === last[0] && first[1] === last[1];

        if (!isClosed) {
            ring.push([...first]);
        }


        return polygon;
    }



    /**
     * Creates a new service area for a user.
     */
    async createServiceArea(userId: string, data: any) {
        const { name, polygon, longitude, latitude, radius } = data;

        if (!name) {
            throw new Error("Name is required");
        }

        const isPolygon = !!polygon;
        const isRadius =
            longitude !== undefined &&
            latitude !== undefined &&
            radius !== undefined;

        if (!isPolygon && !isRadius) {
            throw new Error("Provide either polygon OR longitude+latitude+radius");
        }

        await prisma.$transaction(async (tx) => {

            const serviceArea = await tx.serviceArea.create({
                data: {
                    userId,
                    name,
                    type: isPolygon ? "POLYGON" : "RADIUS"
                }
            });

            if (isPolygon) {
                const normalized = this.normalizePolygon(polygon);
                const geoJson = JSON.stringify(normalized);

                await tx.$executeRaw`
        UPDATE service_areas
        SET area = ST_SetSRID(
          ST_MakeValid(
            ST_GeomFromGeoJSON(${geoJson})
          ),
          4326
        )
        WHERE id = ${serviceArea.id}
      `;

            } else {

                if (radius <= 0) {
                    throw new Error("Radius must be greater than 0");
                }

                await tx.$executeRaw`
        UPDATE service_areas
        SET center = ST_SetSRID(
              ST_Point(${longitude}, ${latitude}),
              4326
            ),
            radius = ${radius}
        WHERE id = ${serviceArea.id}
      `;
            }

            await tx.businessAuditLog.create({
                data: {
                    event: "SERVICE_AREA_CREATED",
                    actorUserId: userId,
                    actorType: "USER",
                    entityType: "SERVICE_AREA",
                    entityId: serviceArea.id,
                    metadata: { name }
                }
            });

        });
    }

    /**
     * Fetches all service areas for a specific user.
     */
    async getUserServiceAreas(userId: string) {

        const areas = await prisma.$queryRaw<
            {
                id: string;
                userId: string;
                name: string;
                type: string;
                createdAt: Date;
                updatedAt: Date;
                polygon: string | null;
                longitude: number | null;
                latitude: number | null;
                radius: number | null;
            }[]
        >`
    SELECT
      id,
      "userId",
      name,
      type,
      "createdAt",
      "updatedAt",
      CASE WHEN area IS NOT NULL
        THEN ST_AsGeoJSON(area)
        ELSE NULL
      END as polygon,
      CASE WHEN center IS NOT NULL
        THEN ST_X(center)
        ELSE NULL
      END as longitude,
      CASE WHEN center IS NOT NULL
        THEN ST_Y(center)
        ELSE NULL
      END as latitude,
      radius
    FROM service_areas
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
  `;

        return areas.map(a => ({
            ...a,
            polygon: a.polygon ? JSON.parse(a.polygon) : null
        }));
    }

    /**
     * Deletes a service area if it belongs to the specified user.
     */
    async deleteServiceArea(serviceAreaId: string, userId: string) {
        try {
            await prisma.$transaction(async (tx) => {
                const result = await tx.serviceArea.deleteMany({
                    where: {
                        id: serviceAreaId,
                        userId
                    }
                });

                if (result.count === 0) {
                    throw new Error("Service area not found");
                }

                await tx.businessAuditLog.create({
                    data: {
                        event: "SERVICE_AREA_DELETED",
                        actorUserId: userId,
                        actorType: "USER",
                        entityType: "SERVICE_AREA",
                        entityId: serviceAreaId,
                        metadata: { serviceAreaId }
                    }
                });
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Returns an array of user IDs whose service areas contain the given point.
     */
    async findIntersectingUsers(longitude: number, latitude: number): Promise<string[]> {

        const result = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT DISTINCT "userId"
    FROM service_areas
    WHERE
      (
        type = 'POLYGON'
        AND area IS NOT NULL
        AND ST_Contains(
          area,
          ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)
        )
      )
      OR
      (
        type = 'RADIUS'
        AND center IS NOT NULL
        AND ST_DWithin(
          center::geography,
          ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)::geography,
          radius
        )
      )
  `;

        return result.map(r => r.userId);
    }

    /**
     * Checks if a point is inside any service area belonging to a specific user.
     */
    async isPointInsideUserArea(
        userId: string,
        longitude: number,
        latitude: number
    ): Promise<boolean> {

        const result = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM service_areas
      WHERE "userId" = ${userId}
      AND (
        (
          type = 'POLYGON'
          AND area IS NOT NULL
          AND ST_Contains(
            area,
            ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)
          )
        )
        OR
        (
          type = 'RADIUS'
          AND center IS NOT NULL
          AND ST_DWithin(
            center::geography,
            ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)::geography,
            radius
          )
        )
      )
    ) as "exists"
  `;

        return result[0]?.exists ?? false;
    }
}

export const serviceAreaService = new ServiceAreaService();