export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { apiKey?: string }
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // If apiKey provided or saved in localStorage, attach it
  const apiKey =
    options?.apiKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('gopay_api_key') : null);
  if (apiKey && !headers.has('x-api-key')) {
    headers.set('x-api-key', apiKey);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  let responseData: unknown = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      // JSON parse failed
    }
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (responseData as { message?: string; error?: string })?.message ||
      (responseData as { message?: string; error?: string })?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, responseData);
  }

  return responseData as T;
}
