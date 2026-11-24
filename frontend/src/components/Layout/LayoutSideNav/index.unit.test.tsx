import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';
import { LayoutProvider } from '@/context/layout/LayoutProvider';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { ThemeProvider } from '@/context/theme/ThemeProvider';

import { LayoutSideNav } from './index';

beforeEach(() => resetApiMock());

const renderNav = (options: Record<string, unknown> = {}) =>
  renderWithProviders(
    <PreferenceProvider>
    <ThemeProvider>
      <LayoutProvider>
        <LayoutSideNav />
      </LayoutProvider>
    </ThemeProvider>
    </PreferenceProvider>,
    options,
  );

describe('LayoutSideNav', () => {
  it('offers an administrator the navigation, grouped into menus', () => {
    renderNav();

    // Carbon drops unknown props on SideNavMenu, so only the menu items carry a test id.
    expect(document.querySelectorAll('[data-testid^="side-nav-menu-item-"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.cds--side-nav__submenu').length).toBeGreaterThan(0);
  });

  it('marks the current page active and expands the group that holds it', () => {
    const first = renderNav();
    const href = document.querySelector('[data-testid^="side-nav-menu-item-"]')?.getAttribute('href') ?? '/';
    first.unmount();

    renderNav({ route: href });

    expect(
      document.querySelector('[aria-current="page"], .cds--side-nav__link--current, .cds--side-nav__menu-item--current'),
    ).not.toBeNull();
    expect(document.querySelector('.cds--side-nav__submenu[aria-expanded="true"]')).not.toBeNull();
  });

  it('shows nothing to a user without welcome access', () => {
    renderNav({ roles: [] });

    expect(document.querySelectorAll('[data-testid^="side-nav-"]').length).toBe(0);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
