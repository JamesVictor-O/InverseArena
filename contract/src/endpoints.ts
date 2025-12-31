import type { ApiResult, HttpMethod } from "./http.js";

/**
 * Add endpoints here as the backend/API crystallizes.
 * The frontend can import these types to stay in sync.
 */
export namespace Endpoints {
  export type Health = {
    method: HttpMethod;
    path: "/health";
    req: null;
    res: ApiResult<{ status: "ok"; time: string }>;
  };
}


