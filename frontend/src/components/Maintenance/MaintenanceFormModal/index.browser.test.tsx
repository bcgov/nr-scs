import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';

import MaintenanceFormModal from './index';

// WhoDidIt (rendered in view mode) calls useAuth; stub it so the modal mounts.
vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

type Props = ComponentProps<typeof MaintenanceFormModal>;

const onClose = vi.fn();
const onEdit = vi.fn();
const onDelete = vi.fn();
const onSave = vi.fn();
const onReset = vi.fn();
const onBack = vi.fn();

const baseProps = (): Props => ({
  modalMode: 'view',
  onClose,
  headings: { create: 'Create Heading', edit: 'Edit Heading', view: 'View Heading' },
  renderViewFields: () => <div>VIEW FIELDS</div>,
  renderFormFields: () => <div>FORM FIELDS</div>,
  onEdit,
  onDelete,
  onSave,
  onReset,
});

const renderModal = (overrides: Partial<Props> = {}) =>
  render(<MaintenanceFormModal {...baseProps()} {...overrides} />);

const modalEl = (container: HTMLElement) => container.querySelector('.cds--modal');

describe('MaintenanceFormModal', () => {
  beforeEach(() => {
    [onClose, onEdit, onDelete, onSave, onReset, onBack].forEach((m) => m.mockReset());
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: undefined,
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);
  });

  it('is closed (not visible) when modalMode is null', () => {
    const { container } = renderModal({ modalMode: null });
    expect(modalEl(container)).not.toHaveClass('is-visible');
    // Neither body slot is rendered when there is no mode.
    expect(screen.queryByText('VIEW FIELDS')).toBeNull();
    expect(screen.queryByText('FORM FIELDS')).toBeNull();
  });

  it('shows the per-mode heading', () => {
    const { rerender } = renderModal({ modalMode: 'view' });
    expect(screen.getByText('View Heading')).toBeVisible();
    rerender(<MaintenanceFormModal {...baseProps()} modalMode="create" />);
    expect(screen.getByText('Create Heading')).toBeVisible();
    rerender(<MaintenanceFormModal {...baseProps()} modalMode="edit" />);
    expect(screen.getByText('Edit Heading')).toBeVisible();
  });

  it('renders view fields with Edit + Delete, and wires their handlers', () => {
    renderModal({ modalMode: 'view' });
    expect(screen.getByText('VIEW FIELDS')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    // The danger Button's accessible name is "dangerDelete" (Carbon assistive
    // text), so match the visible label instead of the computed role name.
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows the delete-blocked warning and hides the Delete button', () => {
    renderModal({ modalMode: 'view', deleteBlockedMessage: 'Has dependents; cannot delete.' });
    expect(screen.getByText('Has dependents; cannot delete.')).toBeVisible();
    expect(screen.queryByText('Delete')).toBeNull();
    // Edit is still offered.
    expect(screen.getByRole('button', { name: /Edit/ })).toBeVisible();
  });

  it('shows a skeleton (not the view fields) while the detail is loading', () => {
    renderModal({ modalMode: 'view', detailLoading: true });
    expect(screen.queryByText('VIEW FIELDS')).toBeNull();
    // View actions are suppressed while loading.
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('renders the error banner when formMessage is set', () => {
    renderModal({ modalMode: 'create', formMessage: 'Could not save record.' });
    expect(screen.getByText('Could not save record.')).toBeVisible();
  });

  it('renders form fields with Save + Reset in create mode and wires handlers', () => {
    renderModal({ modalMode: 'create' });
    expect(screen.getByText('FORM FIELDS')).toBeVisible();
    // No Back button in create mode.
    expect(screen.queryByRole('button', { name: /^Back$/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('offers a Back button only in edit mode when onBack is provided', () => {
    renderModal({ modalMode: 'edit', onBack });
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('disables the actions and swaps the Save label while submitting', () => {
    renderModal({ modalMode: 'edit', onBack, isSubmitting: true });
    expect(screen.getByRole('button', { name: /Saving\.\.\./ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Reset/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Back$/ })).toBeDisabled();
  });

  it('does not close while submitting, but does when idle', () => {
    const { container, rerender } = renderModal({ modalMode: 'view', isSubmitting: true });
    fireEvent.click(container.querySelector('.cds--modal-close')!);
    expect(onClose).not.toHaveBeenCalled();

    rerender(<MaintenanceFormModal {...baseProps()} modalMode="view" isSubmitting={false} />);
    fireEvent.click(container.querySelector('.cds--modal-close')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
