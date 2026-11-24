import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';

import AuthorizationsTabShell from './AuthorizationsTabShell';

const baseProps = {
  addAction: <button type="button">Add Authorization</button>,
  isPending: false,
  isError: false,
  errorDescription: 'The authorizations could not be retrieved.',
  letter: { error: null, busyId: null, clearError: vi.fn() },
  notificationClassName: 'view-scaler__notification',
  statusFilterId: 'scaler-authorizations-status-filter',
  status: 'Active' as const,
  onStatusChange: vi.fn(),
  isEmpty: false,
  emptyDescription: 'This scaler does not have any authorizations for the selected status.',
  children: <table aria-label="Scaler authorizations" />,
};

describe('AuthorizationsTabShell', () => {
  it('shows the Add action in every state, including loading and error', () => {
    const { rerender } = renderWithProviders(<AuthorizationsTabShell {...baseProps} isPending />);
    expect(screen.getByRole('button', { name: 'Add Authorization' })).toBeInTheDocument();

    rerender(<AuthorizationsTabShell {...baseProps} isPending={false} isError />);
    expect(screen.getByRole('button', { name: 'Add Authorization' })).toBeInTheDocument();
  });

  it('renders a skeleton instead of the table while loading', () => {
    renderWithProviders(<AuthorizationsTabShell {...baseProps} isPending />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('surfaces the load failure and withholds the table', () => {
    renderWithProviders(<AuthorizationsTabShell {...baseProps} isError />);

    expect(screen.getByText('Could not load authorizations')).toBeInTheDocument();
    expect(screen.getByText(baseProps.errorDescription)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the table and the status filter once loaded', () => {
    renderWithProviders(<AuthorizationsTabShell {...baseProps} />);

    expect(screen.getByRole('table', { name: 'Scaler authorizations' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('id', baseProps.statusFilterId);
  });

  it('shows the empty state instead of the table when the filter leaves no rows', () => {
    renderWithProviders(<AuthorizationsTabShell {...baseProps} isEmpty />);

    expect(screen.getByText('No authorizations found')).toBeInTheDocument();
    expect(screen.getByText(baseProps.emptyDescription)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a letter failure and lets it be dismissed', () => {
    const clearError = vi.fn();
    renderWithProviders(
      <AuthorizationsTabShell
        {...baseProps}
        letter={{ error: 'Letter service is down.', busyId: null, clearError }}
      />,
    );

    expect(screen.getByText('Authorization letter unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(clearError).toHaveBeenCalled();
  });

  it('shows a downloading notice while a letter is in flight', () => {
    renderWithProviders(
      <AuthorizationsTabShell
        {...baseProps}
        letter={{ error: null, busyId: 12, clearError: vi.fn() }}
      />,
    );

    expect(screen.getByText('Downloading letter')).toBeInTheDocument();
  });

  it('passes the status change through', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <AuthorizationsTabShell {...baseProps} onStatusChange={onStatusChange} />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'All' } });

    expect(onStatusChange).toHaveBeenCalledWith('All');
  });
});
