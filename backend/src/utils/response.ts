import { Response } from "express";
import { RESPONSE_MESSAGES } from "../constants/response.messages";

type SuccessResponse<T> = {
    status: "success";
    statusCode: number;
    message: string;
    data: T;
};

type ErrorResponse = {
    status: "error";
    statusCode: number;
    message: string;
    errors?: unknown[];
    data: null;
};

export function sendSuccess<T>(
    res: Response,
    code: number,
    data: T,
    httpStatus: number = 200
) {
    const payload: SuccessResponse<T> = {
        status: "success",
        statusCode: code,
        message: RESPONSE_MESSAGES[code] ?? "Success",
        data,
    };

    return res.status(httpStatus).json(payload)
}


export function sendError(
    res: Response,
    code: number,
    httpStatus: number = 400,
    errors?: unknown[]
) {
    const payload: ErrorResponse = {
        status: "error",
        statusCode: code,
        message: RESPONSE_MESSAGES[code] ?? "Something went wrong",
        data: null,
    };

    if (errors && errors.length > 0) {
        payload.errors = errors;
    }

    return res.status(httpStatus).json(payload);
}