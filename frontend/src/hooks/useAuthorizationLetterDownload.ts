import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useReportDownload } from '@/components/core/ReportPage/useReportDownload';
import { useAuth } from '@/context/auth/useAuth';
import { extractApiErrorAsync } from '@/utils/extractApiError';

interface LetterDownload {
  blob: Blob;
  filename?: string | null;
}

interface Options {
  /** Fetches the stored letter for an authorization (the `getXxxLetter` service method). */
  fetchLetter: (id: number, token?: string) => Promise<LetterDownload>;
  /** Route to the letter page used when no letter exists yet (create flow). */
  letterRoute: (id: number) => string;
  /** Fallback download filename base passed to {@link useReportDownload}. */
  fallbackBaseName: string;
}

/**
 * Encapsulates the "View Letter" behavior shared by the authorization tabs: when a letter already
 * exists, download the stored PDF; otherwise navigate to the letter page to create one. Tracks the
 * in-flight row (`busyId`) and any download error (`error`) for the caller to render.
 */
export function useAuthorizationLetterDownload({ fetchLetter, letterRoute, fallbackBaseName }: Options) {
  const { userToken } = useAuth();
  const navigate = useNavigate();
  const downloadLetter = useReportDownload('PDF', fallbackBaseName);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const open = useCallback(
    async (id: number | null | undefined, letterExists: boolean | null | undefined) => {
      if (id == null) {
        return;
      }

      if (!letterExists) {
        navigate(letterRoute(id));
        return;
      }

      setError(null);
      setBusyId(id);
      try {
        const token = await userToken();
        const { blob, filename } = await fetchLetter(id, token);
        downloadLetter(blob, filename);
      } catch (e: unknown) {
        setError(await extractApiErrorAsync(e, 'Could not download the authorization letter.'));
      } finally {
        setBusyId(null);
      }
    },
    [downloadLetter, fetchLetter, letterRoute, navigate, userToken],
  );

  return { open, error, busyId, clearError: () => setError(null) };
}
