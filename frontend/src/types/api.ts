// Backend response format (from sendSuccess/sendError)
export interface ApiSuccess<T> {
    status: "success";
    statusCode: number;
    message: string;
    data: T;
}

export interface ApiError {
    status: "error";
    statusCode: number;
    message: string;
    data: null;
    errors?: unknown[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;