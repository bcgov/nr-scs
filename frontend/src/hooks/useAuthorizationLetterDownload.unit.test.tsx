import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const downloadSpy = vi.fn();
vi.mock('@/components/core/ReportPage/useReportDownload', () => ({
  useReportDownload: () => downloadSpy,
}));

const mockUserToken = vi.fn().mockResolvedValue('token');
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: mockUserToken }),
}));

import { useAuthorizationLetterDownload } from './useAuthorizationLetterDownload';

const letterRoute = (id: number) => `/scaler-authorizations/${id}/letter`;

const setup = (fetchLetter: ReturnType<typeof vi.fn>) =>
  renderHook(() =>
    useAuthorizationLetterDownload({ fetchLetter, letterRoute, fallbackBaseName: 'scaler-authorization-letter' }),
  );

describe('useAuthorizationLetterDownload', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    downloadSpy.mockReset();
    mockUserToken.mockClear();
  });

  it('is a no-op when id is null', async () => {
    const fetchLetter = vi.fn();
    const { result } = setup(fetchLetter);

    await act(async () => {
      await result.current.open(null, true);
    });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fetchLetter).not.toHaveBeenCalled();
  });

  it('navigates to the letter route when no letter exists yet', async () => {
    const fetchLetter = vi.fn();
    const { result } = setup(fetchLetter);

    await act(async () => {
      await result.current.open(5, false);
    });

    expect(navigateSpy).toHaveBeenCalledWith('/scaler-authorizations/5/letter');
    expect(fetchLetter).not.toHaveBeenCalled();
  });

  it('downloads the stored letter (with token) when one exists', async () => {
    const blob = new Blob(['pdf']);
    const fetchLetter = vi.fn().mockResolvedValue({ blob, filename: 'letter.pdf' });
    const { result } = setup(fetchLetter);

    await act(async () => {
      await result.current.open(5, true);
    });

    expect(fetchLetter).toHaveBeenCalledWith(5, 'token');
    expect(downloadSpy).toHaveBeenCalledWith(blob, 'letter.pdf');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(result.current.busyId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('tracks busyId while the download is in flight and clears it after', async () => {
    let resolveFetch!: (v: { blob: Blob; filename: string | null }) => void;
    const fetchLetter = vi.fn().mockImplementation(
      () => new Promise((res) => { resolveFetch = res; }),
    );
    const { result } = setup(fetchLetter);

    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open(5, true);
    });

    await waitFor(() => expect(result.current.busyId).toBe(5));

    await act(async () => {
      resolveFetch({ blob: new Blob(['pdf']), filename: null });
      await openPromise;
    });

    expect(result.current.busyId).toBeNull();
  });

  it('captures a download error and clears it on clearError', async () => {
    const fetchLetter = vi.fn().mockRejectedValue(new Error('nope'));
    const { result } = setup(fetchLetter);

    await act(async () => {
      await result.current.open(5, true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.busyId).toBeNull();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});
