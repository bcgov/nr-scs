/** True when the error is an HTTP 403 (access denied) response. */
export function isForbiddenError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403
  );
}

/**
 * Pulls a human-readable message out of an unknown error thrown by an API call.
 * Prefers the backend's `response.data.message` (the OpenAPI `{ code, message }`
 * error shape this app returns), then the legacy `response.data.error` /
 * `response.data.code` fields, then a plain Error message, and finally the
 * supplied fallback.
 */
export function extractApiError(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (
      error as { response?: { data?: { message?: string; error?: string; code?: string } } }
    ).response?.data;
    const errorMessage = error instanceof Error ? error.message : undefined;
    return data?.message ?? data?.error ?? data?.code ?? errorMessage ?? fallbackMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

/** One field-scoped validation error from the backend's `{ code, message, fieldErrors }` body. */
export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Pulls the structured `fieldErrors` out of a thrown Axios error (the OpenAPI error body
 * `{ code, message, fieldErrors?: [{ field, message }] }` this app returns on a
 * `FieldValidationException`). Returns an empty array when the error carries no field errors,
 * so callers can fall back to a banner via {@link extractApiError}.
 */
export function extractFieldErrors(error: unknown): ApiFieldError[] {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const fieldErrors = (
      error as { response?: { data?: { fieldErrors?: unknown } } }
    ).response?.data?.fieldErrors;
    if (Array.isArray(fieldErrors)) {
      return fieldErrors.filter(
        (fe): fe is ApiFieldError =>
          typeof fe === 'object' &&
          fe !== null &&
          typeof (fe as ApiFieldError).field === 'string' &&
          typeof (fe as ApiFieldError).message === 'string',
      );
    }
  }
  return [];
}

/**
 * Async variant of {@link extractFieldErrors} for requests made with `responseType: 'blob'`, whose JSON error
 * body arrives as a `Blob` and must be parsed first. Non-Blob errors defer to {@link extractFieldErrors}.
 */
export async function extractFieldErrorsAsync(error: unknown): Promise<ApiFieldError[]> {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  if (data instanceof Blob) {
    try {
      return extractFieldErrors({ response: { data: JSON.parse(await data.text()) } });
    } catch {
      return [];
    }
  }
  return extractFieldErrors(error);
}

/**
 * Async variant for requests made with `responseType: 'blob'` (e.g. PDF/letter
 * downloads). When such a request fails, the backend's JSON `{ code, message }`
 * error body arrives as a `Blob`, so it must be read and parsed before the message
 * can be extracted. Non-Blob errors defer to {@link extractApiError}.
 */
export async function extractApiErrorAsync(error: unknown, fallbackMessage: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.message ?? parsed?.error ?? fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
  return extractApiError(error, fallbackMessage);
}
