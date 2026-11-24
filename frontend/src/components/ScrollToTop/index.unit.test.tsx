import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ScrollToTop from './index';

import type { FC } from 'react';

const scrollTo = vi.fn();

/** Renders a link-free navigator so a test can drive a client-side navigation directly. */
const Navigator: FC<{ to: string }> = ({ to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  );
};

/** Echoes the current URL so a test can prove the navigation under test actually happened. */
const CurrentUrl: FC = () => {
  const { pathname, search, hash } = useLocation();
  return <output>{`${pathname}${search}${hash}`}</output>;
};

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <ScrollToTop />
      <CurrentUrl />
      <Routes>
        <Route path="/mark-site-designations/view/:id" element={<Navigator to="/scalers/view/1" />} />
        <Route path="/scalers/view/:id" element={<Navigator to="/scalers/view/1?tab=summary-check-scales" />} />
        <Route path="/anchored" element={<div>anchored</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', scrollTo);
    scrollTo.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scrolls to the top when the path changes — the reported bug', () => {
    const { getByRole } = renderAt('/mark-site-designations/view/9');
    scrollTo.mockClear(); // ignore the initial mount

    fireEvent.click(getByRole('button'));

    expect(screen.getByRole('status')).toHaveTextContent('/scalers/view/1');
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('leaves the scroll alone when only the query string changes, e.g. a ?tab= switch', () => {
    const { getByRole } = renderAt('/scalers/view/1');
    scrollTo.mockClear();

    fireEvent.click(getByRole('button'));

    expect(screen.getByRole('status')).toHaveTextContent('/scalers/view/1?tab=summary-check-scales');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves the scroll alone for a #hash target so anchor deep links still land on it', () => {
    renderAt('/anchored#section-2');

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
