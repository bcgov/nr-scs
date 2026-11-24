import { describe, expect, it } from 'vitest';

import { extractFilename } from './contentDisposition';

describe('extractFilename', () => {
  it('returns null when the header is missing', () => {
    expect(extractFilename(undefined)).toBeNull();
    expect(extractFilename(null)).toBeNull();
    expect(extractFilename('')).toBeNull();
  });

  it('reads a plain quoted filename', () => {
    expect(extractFilename('attachment; filename="R004-advisory-letter.pdf"')).toBe(
      'R004-advisory-letter.pdf',
    );
  });

  it('reads an unquoted filename', () => {
    expect(extractFilename('attachment; filename=report.xls')).toBe('report.xls');
  });

  it('is case-insensitive about the parameter name', () => {
    expect(extractFilename('attachment; FileName="report.pdf"')).toBe('report.pdf');
  });

  it('decodes an RFC 5987 UTF-8 filename', () => {
    expect(
      extractFilename("attachment; filename*=UTF-8''Rapport%20d%C3%A9taill%C3%A9.pdf"),
    ).toBe('Rapport détaillé.pdf');
  });

  it('prefers the UTF-8 form when the header carries both', () => {
    const header =
      'attachment; filename="Rapport detaille.pdf"; ' +
      "filename*=UTF-8''Rapport%20d%C3%A9taill%C3%A9.pdf";

    expect(extractFilename(header)).toBe('Rapport détaillé.pdf');
  });

  it('stops the plain form at the next parameter rather than swallowing it', () => {
    expect(extractFilename('attachment; filename="report.pdf"; size=1024')).toBe('report.pdf');
  });

  it('returns null for a header with no filename parameter', () => {
    expect(extractFilename('inline')).toBeNull();
    expect(extractFilename('attachment')).toBeNull();
  });

  it('keeps spaces inside a quoted filename', () => {
    expect(extractFilename('attachment; filename="Scaling Administration Report.pdf"')).toBe(
      'Scaling Administration Report.pdf',
    );
  });
});
