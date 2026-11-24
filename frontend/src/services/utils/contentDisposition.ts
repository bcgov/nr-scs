/**
 * Extracts the filename from a Content-Disposition header value.
 * Handles both RFC 5987 UTF-8 encoded and plain quoted forms.
 */
export const extractFilename = (contentDisposition?: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
};
