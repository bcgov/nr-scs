import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { extractApiErrorAsync, extractFieldErrorsAsync } from '@/utils/extractApiError';

import { useReportDownload } from './useReportDownload';

/** The File Format option → the API's output format. */
const outputFormatMap: Record<string, 'PDF' | 'XLS'> = {
  PDF: 'PDF',
  'MS Excel': 'XLS',
};

/** What every report submit endpoint resolves to. */
export interface ReportSubmitResult {
  blob: Blob;
  filename?: string | null;
}

interface Options {
  /** Download file name (before the extension) when the server sends none, e.g. `'Scaling-Exception'`. */
  downloadBaseName: string;
  /** Turns a failed request into the error banner's text. Defaults to {@link defaultErrorMessage}. */
  toErrorMessage?: (err: unknown) => string | Promise<string>;
}

interface SubmitOptions {
  /**
   * Pre-send checks that need the token (e.g. "does this mark exist?"). Return `false` to stop the send — the
   * check has already flagged what it found (a field error, or a banner via `setError`). A check that throws is
   * reported like a failed send.
   */
  checks?: (token: string | undefined) => Promise<boolean>;
  /**
   * Run `checks` BEFORE entering the loading state, so "Report Generating..." is not shown during them. By default
   * they run inside it.
   */
  checksBeforeLoading?: boolean;
}

/**
 * The server's own words for a failed submit. The report endpoints are fetched with `responseType: 'blob'`, so an
 * error body (e.g. a 400's per-field messages) arrives as a Blob — read naively it yields only axios's
 * "Request failed with status code 400". Field messages win, then the body's message, then the error's own.
 */
const defaultErrorMessage = async (err: unknown): Promise<string> => {
  const fieldErrors = await extractFieldErrorsAsync(err);
  if (fieldErrors.length > 0) {
    return fieldErrors.map((fieldError) => fieldError.message).join(' ');
  }
  return extractApiErrorAsync(err, 'Unable to submit report');
};

/**
 * The submit flow every report screen shares: the output options (File Format / Email Recipient / Preview Report),
 * the loading / success / error state ReportPage renders, and the send itself — download and "Report Generated"
 * for a preview or an un-addressed request, "Report request submitted" when it was emailed instead.
 *
 * A screen keeps only what is its own: its parameters, its payload (spreading `outputParams` into it), and any
 * checks it runs before sending.
 */
export const useReportSubmission = ({ downloadBaseName, toErrorMessage = defaultErrorMessage }: Options) => {
  const { userToken } = useAuth();
  const [fileFormat, setFileFormat] = useState('PDF');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [previewReport, setPreviewReport] = useState('Yes');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const downloadReport = useReportDownload(fileFormat, downloadBaseName);

  /** The output fields every report request carries; spread into the screen's payload. */
  const outputParams = useMemo(() => ({
    outputFormat: outputFormatMap[fileFormat] ?? 'PDF',
    emailRecipient: emailRecipient || undefined,
    preview: previewReport === 'Yes',
  }), [emailRecipient, fileFormat, previewReport]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /** Reset's share: the output options back to their defaults, and no banner. */
  const resetOutput = useCallback(() => {
    setFileFormat('PDF');
    setEmailRecipient('');
    setPreviewReport('Yes');
    setError(null);
    setSuccess(null);
  }, []);

  const submit = useCallback(async (
    send: (token: string | undefined) => Promise<ReportSubmitResult>,
    { checks, checksBeforeLoading = false }: SubmitOptions = {},
  ) => {
    if (!checksBeforeLoading) {
      setIsLoading(true);
    }
    try {
      const token = await userToken();
      if (checks && !(await checks(token))) {
        return;
      }
      if (checksBeforeLoading) {
        setIsLoading(true);
      }

      const { blob, filename } = await send(token);

      if (previewReport === 'Yes' || !emailRecipient) {
        downloadReport(blob, filename);
        setSuccess('Report Generated');
      } else {
        setSuccess('Report request submitted');
      }
    } catch (err) {
      setError(await toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [downloadReport, emailRecipient, previewReport, toErrorMessage, userToken]);

  /** The props ReportPage's `outputOptions` needs from this hook; a screen adds onSend / onReset / layout. */
  const outputOptions = {
    fileFormat,
    onFileFormatChange: setFileFormat,
    emailRecipient,
    onEmailRecipientChange: setEmailRecipient,
    previewReport,
    onPreviewChange: setPreviewReport,
    onValidationError: () => setSuccess(null),
  };

  return {
    fileFormat,
    emailRecipient,
    previewReport,
    outputParams,
    isLoading,
    error,
    setError,
    success,
    clearMessages,
    resetOutput,
    submit,
    outputOptions,
  };
};
