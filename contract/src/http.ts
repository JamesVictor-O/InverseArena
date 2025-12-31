export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export type ApiError = {
  code: string;
  message: string;
  details?: JsonValue;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };


