import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';

import { PreferenceProvider } from './PreferenceProvider';
import { usePreference } from './usePreference';
import { loadUserPreference, saveUserPreference } from './utils';

vi.mock('@/context/preference/utils', () => {
  return {
    loadUserPreference: vi.fn(),
    saveUserPreference: vi.fn(),
    initialValue: {
      theme: 'white',
      testData: 'default',
    },
  };
});

const TestComponent = () => {
  const { userPreference, updatePreferences } = usePreference();
  const [testData, setTestData] = useState<string>(
    (userPreference.testData as string) || 'default',
  );

  useEffect(() => {
    if (userPreference.testData) {
      setTestData(userPreference.testData as string);
    }
  }, [userPreference.testData]);

  return (
    <>
      <span data-testid="test-value">{testData}</span>
      <button onClick={() => updatePreferences({ testData: 'g100' })}>Set g100</button>
    </>
  );
};

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <TestComponent />
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('PreferenceContext', () => {
  it('provides the default userPreference', async () => {
    (loadUserPreference as vi.Mock).mockResolvedValue({ theme: 'white', testData: 'default' });
    await renderWithProviders();
    expect(screen.getByTestId('test-value').textContent).toBe('default');
  });

  /**
   * `updatePreferences` returns early until the load has landed, and the load is a react-query fetch that
   * is not settled by `renderWithProviders`' single act() flush. So the click must wait for it — hence the
   * distinct `loaded` value, which is the only way to tell "the query resolved" from "still on the
   * initialValue fallback" (both were `default` before).
   *
   * This test used to assert `default` pre-click and `g100` post-click while mocking load with a chained
   * .mockResolvedValue whose second call silently overrode the first. Load therefore returned `g100`, the
   * click was a no-op early-return, and the final assertion passed because the LOAD landed during
   * waitFor — never exercising the save path the test is named for. It went red when an unrelated change
   * to the suite altered scheduling.
   */
  it('updatePreferences changes the testData', async () => {
    (loadUserPreference as vi.Mock).mockResolvedValue({ theme: 'white', testData: 'loaded' });
    (saveUserPreference as vi.Mock).mockResolvedValue({ theme: 'white', testData: 'g100' });
    await renderWithProviders();

    // The load has landed, so the click below cannot early-return.
    await waitFor(() => {
      expect(screen.getByTestId('test-value').textContent).toBe('loaded');
    });

    await act(async () => screen.getByText('Set g100').click());
    await waitFor(() => {
      expect(screen.getByTestId('test-value').textContent).toBe('g100');
    });
    expect(saveUserPreference).toHaveBeenCalledWith({ theme: 'white', testData: 'g100' });
  });

  it('throws if usePreference is used outside of PreferenceProvider', async () => {
    expect(() => render(<TestComponent />)).toThrow(
      'usePreference must be used within a PreferenceProvider',
    );
  });
});
