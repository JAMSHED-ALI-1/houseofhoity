import { API_CONFIG, STORAGE_KEYS } from "@/constants/app.constants";
import { BASE_URL } from "@/types/API_URL";

const DEFAULT_BASE_URL = BASE_URL;

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function getApiBaseUrl(baseUrl) {
  return trimSlashes(baseUrl || DEFAULT_BASE_URL);
}

function buildApiUrl(endpoint, { baseUrl, query } = {}) {
  if (endpoint.startsWith("/") && typeof window !== "undefined") {
    const url = new URL(endpoint, window.location.origin);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        if (Array.isArray(value)) {
          value.forEach((item) => url.searchParams.append(key, String(item)));
          return;
        }

        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  const cleanEndpoint = trimSlashes(endpoint);
  const url = new URL(
    /^https?:\/\//i.test(endpoint)
      ? endpoint
      : `${getApiBaseUrl(baseUrl)}/${cleanEndpoint}`,
  );

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function getAuthHeaders(headers = {}) {
  if (headers.Authorization || typeof window === "undefined") {
    return headers;
  }

  const token = window.localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  if (!token) {
    return headers;
  }

  return {
    Authorization: `Bearer ${token}`,
    ...headers,
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export class ApiError extends Error {
  constructor(message, { status, code, details, response } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.response = response;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const {
    baseUrl,
    body,
    headers,
    query,
    timeout = API_CONFIG.DEFAULT_TIMEOUT,
    ...fetchOptions
  } = options;

  let didTimeout = false;
  const controller = new AbortController();
  const timeoutId = timeout
    ? setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeout)
    : null;
  const hasJsonBody = body !== undefined && body !== null && !(body instanceof FormData);
  const cacheOptions = fetchOptions.cache || fetchOptions.next?.revalidate !== undefined ? {} : { cache: "no-store" };
  const abortRequest = () => controller.abort();

  if (fetchOptions.signal) {
    if (fetchOptions.signal.aborted) {
      controller.abort();
    } else {
      fetchOptions.signal.addEventListener("abort", abortRequest, { once: true });
    }
  }

  try {
    const response = await fetch(buildApiUrl(endpoint, { baseUrl, query }), {
      ...cacheOptions,
      ...fetchOptions,
      credentials: fetchOptions.credentials || "include",
      headers: {
        Accept: "application/json",
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
        ...getAuthHeaders(headers),
      },
      body: hasJsonBody ? JSON.stringify(body) : body,
      signal: controller.signal,
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(
        data?.message || data?.error?.message || `Request failed with status ${response.status}`,
        {
          status: response.status,
          code: data?.code || data?.error?.code,
          details: data,
          response,
        },
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError(didTimeout ? "Request timed out" : "Request cancelled", {
        code: didTimeout ? "REQUEST_TIMEOUT" : "REQUEST_ABORTED",
      });
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error.message || "Something went wrong while calling the API", {
      code: "NETWORK_ERROR",
      details: error,
    });
  } finally {
    if (fetchOptions.signal) {
      fetchOptions.signal.removeEventListener("abort", abortRequest);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function jsonRpcRequest(endpoint, params = {}, options = {}) {
  const data = await apiRequest(endpoint, {
    method: "POST",
    ...options,
    body: {
      jsonrpc: "2.0",
      method: "call",
      params,
      ...options.body,
    },
  });

  if (data?.error) {
    throw new ApiError(data.error.message || "JSON-RPC request failed", {
      code: data.error.code,
      details: data.error.data || data.error,
    });
  }

  return data?.result;
}

export const apiClient = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PATCH", body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: "DELETE" }),
  rpc: jsonRpcRequest,
};
