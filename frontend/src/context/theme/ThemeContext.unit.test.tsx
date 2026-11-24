import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { CARBON_THEMES } from '@/context/preference/types';

import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';

const TestComponent = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={() => setTheme('g100')}>Set g100</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-carbon-theme');
});

afterEach(() => {
  cleanup();
});

describe('ThemeContext', () => {
  it('provides the default theme', async () => {
    await renderWithProviders();

    expect(screen.getByTestId('theme-value').textContent).toBe('white');
  });

  it('setTheme changes the theme', async () => {
    await renderWithProviders();

    act(() => screen.getByText('Set g100').click());

    expect(CARBON_THEMES).toContain(screen.getByTestId('theme-value').textContent);
    expect(screen.getByTestId('theme-value').textContent).toBe('g100');
  });

  it('toggleTheme toggles between white and g100', async () => {
    await renderWithProviders();

    // Default is white, toggle should set to g100
    act(() => screen.getByText('Toggle').click());
    await waitFor(() => {
      expect(screen.getByTestId('theme-value').textContent).toBe('g100');
    });

    // Toggle again should set back to white
    act(() => screen.getByText('Toggle').click());
    await waitFor(() => {
      expect(screen.getByTestId('theme-value').textContent).toBe('white');
    });
  });

  it('throws if useTheme is used outside of ThemeProvider', async () => {
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within a ThemeProvider');
  });
});
