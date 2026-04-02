import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils";
import { ANNOTATION_CODES, HTTP_STATUS } from "../constants";

export const validate =
    (schema: ZodSchema, source: "body" | "params" = "body") =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req[source]);

            if (!result.success) {
                return sendError(
                    res,
                    ANNOTATION_CODES.ANNOTATION_INVALID_INPUT,
                    HTTP_STATUS.BAD_REQUEST,
                    result.error.issues
                )
            }


            // we will sanitize this. 
            req[source] = result.data;

            next();
        }
