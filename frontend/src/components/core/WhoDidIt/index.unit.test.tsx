import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AuthContext } from '@/context/auth/AuthContext';
import type { AuditDetails } from '@/services/audit.types';
import { renderWithProviders, testAuthContext, testUser } from '@/config/tests/renderWithProviders';

import WhoDidIt from './index';

const audit = (overrides: Partial<AuditDetails> = {}): AuditDetails =>
  ({
    entryUserid: 'IDIR\\JSMITH',
    entryTimestamp: '2026-01-31T14:30:22Z',
    updateUserid: 'IDIR\\ABROWN',
    updateTimestamp: '2026-02-01T09:05:00Z',
    revisionCount: 3,
    ...overrides,
  }) as AuditDetails;

/** Renders with an auth context whose user signed in through a non-IDIR provider. */
const renderAsBceid = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = { ...testUser([]), idpProvider: 'BCEIDBUSINESS' };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={testAuthContext(user)}>{ui}</AuthContext.Provider>
    </QueryClientProvider>,
  );
};

/** The value rendered in the <dd> that follows a given <dt> label. */
const valueFor = (label: string): string | null => {
  const term = screen.getByText(label);
  return term.parentElement?.querySelector('.who-did-it__value')?.textContent ?? null;
};

const openPopup = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Who Did It?' }));
};

describe('WhoDidIt trigger visibility', () => {
  it('renders the trigger for an IDIR user', () => {
    renderWithProviders(<WhoDidIt audit={audit()} />);

    expect(screen.getByRole('button', { name: 'Who Did It?' })).toBeInTheDocument();
  });

  it('renders nothing at all for a non-IDIR user', () => {
    // Legacy parity: the taglib emitted the trigger only for government users.
    const { container } = renderAsBceid(<WhoDidIt audit={audit()} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Who Did It?' })).not.toBeInTheDocument();
  });

  it('accepts a custom label for the trigger and the heading', () => {
    renderWithProviders(<WhoDidIt audit={audit()} label="Audit info" />);

    expect(screen.getByRole('button', { name: 'Audit info' })).toBeInTheDocument();
  });
});

describe('WhoDidIt audit fields', () => {
  it('shows the five audit rows', async () => {
    renderWithProviders(<WhoDidIt audit={audit()} />);
    await openPopup();

    expect(valueFor('Who Created:')).toBe('IDIR\\JSMITH');
    expect(valueFor('Who Updated:')).toBe('IDIR\\ABROWN');
    expect(valueFor('Revision Count:')).toBe('3');
  });

  it('converts a UTC instant to Pacific time', async () => {
    renderWithProviders(<WhoDidIt audit={audit()} />);
    await openPopup();

    // 14:30:22Z on 31 Jan is 06:30:22 in Vancouver (UTC-8, standard time).
    expect(valueFor('When Created:')).toBe('2026-01-31 06:30:22');
  });

  it('honours a summer offset, so the conversion is not a fixed -8', async () => {
    renderWithProviders(
      <WhoDidIt audit={audit({ entryTimestamp: '2026-07-15T14:30:22Z' })} />,
    );
    await openPopup();

    // July is PDT (UTC-7).
    expect(valueFor('When Created:')).toBe('2026-07-15 07:30:22');
  });

  it('handles an instant given with an explicit offset rather than Z', async () => {
    renderWithProviders(
      <WhoDidIt audit={audit({ entryTimestamp: '2026-01-31T14:30:22+00:00' })} />,
    );
    await openPopup();

    expect(valueFor('When Created:')).toBe('2026-01-31 06:30:22');
  });

  it('handles fractional seconds', async () => {
    renderWithProviders(
      <WhoDidIt audit={audit({ entryTimestamp: '2026-01-31T14:30:22.123Z' })} />,
    );
    await openPopup();

    expect(valueFor('When Created:')).toBe('2026-01-31 06:30:22');
  });

  it('shows a zone-less timestamp by its own components, unshifted', async () => {
    // Not an absolute instant, so there is nothing to convert — showing it shifted would be a lie.
    renderWithProviders(
      <WhoDidIt audit={audit({ entryTimestamp: '2026-01-31T14:30:22' })} />,
    );
    await openPopup();

    expect(valueFor('When Created:')).toBe('2026-01-31 14:30:22');
  });

  it('accepts a space separator in a zone-less timestamp', async () => {
    renderWithProviders(
      <WhoDidIt audit={audit({ entryTimestamp: '2026-01-31 14:30:22' })} />,
    );
    await openPopup();

    expect(valueFor('When Created:')).toBe('2026-01-31 14:30:22');
  });

  it('passes through a value that does not look like a date-time', async () => {
    renderWithProviders(<WhoDidIt audit={audit({ entryTimestamp: 'unknown' })} />);
    await openPopup();

    expect(valueFor('When Created:')).toBe('unknown');
  });

  it('shows blanks rather than defaults when the audit fields are absent', async () => {
    renderWithProviders(<WhoDidIt audit={{} as AuditDetails} />);
    await openPopup();

    expect(valueFor('When Created:')).toBe('');
    expect(valueFor('Who Created:')).toBe('');
    // An unset revision count is blank, not 0 — the record has no revisions recorded.
    expect(valueFor('Revision Count:')).toBe('');
  });

  it('shows a zero revision count as 0, not as blank', async () => {
    renderWithProviders(<WhoDidIt audit={audit({ revisionCount: 0 })} />);
    await openPopup();

    expect(valueFor('Revision Count:')).toBe('0');
  });

  it('renders with no audit record at all', async () => {
    renderWithProviders(<WhoDidIt audit={null} />);
    await openPopup();

    expect(valueFor('Who Created:')).toBe('');
  });
});

describe('WhoDidIt loading state', () => {
  it('shows a skeleton instead of the field list while loading', async () => {
    renderWithProviders(<WhoDidIt audit={null} loading />);
    await openPopup();

    expect(screen.queryByLabelText('Audit fields')).not.toBeInTheDocument();
  });

  it('shows the field list once loading finishes', async () => {
    renderWithProviders(<WhoDidIt audit={audit()} loading={false} />);
    await openPopup();

    expect(screen.getByLabelText('Audit fields')).toBeInTheDocument();
  });
});
