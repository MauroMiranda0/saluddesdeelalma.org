const defaultApiBaseUrl = "http://localhost:4000/api/v1";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export const apiRequest = async <TResponse>(
  path: string,
  options: ApiRequestOptions = {}
) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers
    },
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      response.status,
      payload?.message ?? "API request failed",
      payload?.code
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};
