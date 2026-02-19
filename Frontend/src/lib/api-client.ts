import { config } from "@/lib/config";
import type { ApiEnvelope, ApiErrorEnvelope } from "@/types/api";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "ApiClientError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

async function parseError(response: Response) {
  try {
    return (await response.json()) as ApiErrorEnvelope;
  } catch {
    return {
      error: {
        code: "HTTP_ERROR",
        message: `Request failed with status ${response.status}`
      }
    };
  }
}

export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {}
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const payload = await parseError(response);
      throw new ApiClientError({
        status: response.status,
        code: payload.error.code,
        message: payload.error.message,
        requestId: payload.error.requestId,
        details: payload.error.details
      });
    }

    const payload = (await response.json()) as ApiEnvelope<TData>;
    return payload.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError({
        status: 408,
        code: "REQUEST_TIMEOUT",
        message: "The request timed out. Please try again."
      });
    }

    throw new ApiClientError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the API. Check your connection and backend URL."
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
