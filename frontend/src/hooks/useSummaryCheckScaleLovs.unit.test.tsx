import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/context/auth/AuthContext';
import { testAuthContext, testUser } from '@/config/tests/renderWithProviders';
import API from '@/services/APIs';

import { useSummaryCheckScaleLovs } from './useSummaryCheckScaleLovs';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={testAuthContext(testUser([]))}>{children}</AuthContext.Provider>
);

describe('useSummaryCheckScaleLovs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the four static LOVs and the SPG cross-reference', async () => {
    const getStaticLov = vi
      .spyOn(API.lov, 'getStaticLov')
      .mockImplementation(async ({ tableKey }: { tableKey: string }) => [
        { code: tableKey, description: tableKey },
      ]);
    const getXref = vi
      .spyOn(API.lov, 'getSpeciesProductGradeXref')
      .mockResolvedValue([{ speciesCode: 'S' }] as never);

    const { result } = renderHook(() => useSummaryCheckScaleLovs(), { wrapper });

    await waitFor(() => expect(result.current.spgXref).toHaveLength(1));

    expect(getStaticLov).toHaveBeenCalledTimes(4);
    expect(
      getStaticLov.mock.calls.map(([args]) => (args as { tableKey: string }).tableKey).sort(),
    ).toEqual([
      'CHECK_SCALE_TYPE_CODE',
      'SCALE_GRADE_CODE',
      'SCALE_PRODUCT_CODE',
      'SCALE_SPECIES_CODE',
    ]);
    expect(getXref).toHaveBeenCalledTimes(1);
    expect(result.current.checkScaleTypeOptions[0].code).toBe('CHECK_SCALE_TYPE_CODE');
  });

  it('starts empty before the requests resolve', () => {
    vi.spyOn(API.lov, 'getStaticLov').mockReturnValue(new Promise(() => {}) as never);
    vi.spyOn(API.lov, 'getSpeciesProductGradeXref').mockReturnValue(new Promise(() => {}) as never);

    const { result } = renderHook(() => useSummaryCheckScaleLovs(), { wrapper });

    expect(result.current.checkScaleTypeOptions).toEqual([]);
    expect(result.current.spgXref).toEqual([]);
  });

  it('resets every list when a request fails, rather than half-populating the form', async () => {
    vi.spyOn(API.lov, 'getStaticLov').mockResolvedValue([{ code: 'A' }] as never);
    vi.spyOn(API.lov, 'getSpeciesProductGradeXref').mockRejectedValue(new Error('xref down'));

    const { result } = renderHook(() => useSummaryCheckScaleLovs(), { wrapper });

    await waitFor(() => expect(API.lov.getSpeciesProductGradeXref).toHaveBeenCalled());
    await waitFor(() => {
      expect(result.current.checkScaleTypeOptions).toEqual([]);
      expect(result.current.speciesLov).toEqual([]);
      expect(result.current.productLov).toEqual([]);
      expect(result.current.gradeLov).toEqual([]);
      expect(result.current.spgXref).toEqual([]);
    });
  });

  it('treats a null response as an empty list', async () => {
    vi.spyOn(API.lov, 'getStaticLov').mockResolvedValue(null as never);
    vi.spyOn(API.lov, 'getSpeciesProductGradeXref').mockResolvedValue(null as never);

    const { result } = renderHook(() => useSummaryCheckScaleLovs(), { wrapper });

    await waitFor(() => expect(API.lov.getSpeciesProductGradeXref).toHaveBeenCalled());
    expect(result.current.speciesLov).toEqual([]);
  });
});
