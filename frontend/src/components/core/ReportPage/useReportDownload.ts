import { useCallback, useEffect, useRef } from 'react';

export const useReportDownload = (fileFormat: string, fallbackBaseName: string) => {
  const downloadUrlRef = useRef<string | null>(null);

  const downloadReport = useCallback((blob: Blob, filenameOverride?: string | null) => {
    if (downloadUrlRef.current) {
      globalThis.URL.revokeObjectURL(downloadUrlRef.current);
    }

    const url = globalThis.URL.createObjectURL(blob);
    downloadUrlRef.current = url;

    const extension = fileFormat === 'MS Excel' ? 'xls' : 'pdf';
    const filename = filenameOverride || `${fallbackBaseName}.${extension}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    globalThis.setTimeout(() => {
      if (downloadUrlRef.current) {
        globalThis.URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = null;
      }
    }, 5000);
  }, [fallbackBaseName, fileFormat]);

  useEffect(() => () => {
    if (downloadUrlRef.current) {
      globalThis.URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
  }, []);

  return downloadReport;
};
