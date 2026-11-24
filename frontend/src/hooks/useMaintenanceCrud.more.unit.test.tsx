import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { testAuthContext, testUser } from '@/config/tests/renderWithProviders';
import { AuthContext } from '@/context/auth/AuthContext';

import { useMaintenanceCrud, type MaintenanceCrudConfig } from './useMaintenanceCrud';

type Item = { id: number; name: string };
type Form = { name: string };

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={testAuthContext(testUser([]))}>{children}</AuthContext.Provider>
);

const baseConfig = (
  overrides: Partial<MaintenanceCrudConfig<Item, Item, Form, Form, Form>> = {},
): MaintenanceCrudConfig<Item, Item, Form, Form, Form> => ({
  search: vi.fn().mockResolvedValue([{ id: 1, name: 'One' }]),
  create: vi.fn().mockResolvedValue({ id: 2, name: 'Two' }),
  update: vi.fn().mockResolvedValue({ id: 1, name: 'Renamed' }),
  remove: vi.fn().mockResolvedValue(undefined),
  emptyForm: { name: '' },
  applyToForm: (entity) => ({ name: entity.name }),
  buildCreatePayload: (form) => form,
  buildUpdatePayload: (form) => form,
  validate: (form) => (form.name.trim() ? {} : { name: 'Name is required.' }),
  fetchDetailOnView: false,
  ...overrides,
});

const setup = async (config = baseConfig()) => {
  const hook = renderHook(() => useMaintenanceCrud(config), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

describe('useMaintenanceCrud — loading', () => {
  it('loads the list on mount', async () => {
    const { result } = await setup();

    expect(result.current.items).toEqual([{ id: 1, name: 'One' }]);
    expect(result.current.error).toBeNull();
  });

  it('reports a load failure and empties the list rather than showing stale rows', async () => {
    const config = baseConfig({
      search: vi.fn().mockRejectedValue(new Error('list service down')),
      messages: { load: 'Could not load conditions.' },
    });
    const { result } = await setup(config);

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBe('list service down');
  });

  it('treats a non-array response as empty', async () => {
    const { result } = await setup(baseConfig({ search: vi.fn().mockResolvedValue(null as never) }));

    expect(result.current.items).toEqual([]);
  });
});

describe('useMaintenanceCrud — save', () => {
  it('refuses to save an invalid form and surfaces the field error', async () => {
    const config = baseConfig();
    const { result } = await setup(config);

    act(() => result.current.openCreate());
    await act(async () => {
      await result.current.onSave();
    });

    expect(result.current.formErrors).toEqual({ name: 'Name is required.' });
    expect(config.create).not.toHaveBeenCalled();
  });

  it('creates, switches to view and reloads the list', async () => {
    const config = baseConfig();
    const { result } = await setup(config);

    act(() => result.current.openCreate());
    act(() => result.current.updateForm({ name: 'Two' }));
    await act(async () => {
      await result.current.onSave();
    });

    expect(config.create).toHaveBeenCalledWith({ name: 'Two' }, 'test-token');
    expect(result.current.modalMode).toBe('view');
    expect(config.search).toHaveBeenCalledTimes(2);
  });

  it('surfaces a save failure and stays on the form', async () => {
    const config = baseConfig({
      create: vi.fn().mockRejectedValue(new Error('save exploded')),
    });
    const { result } = await setup(config);

    act(() => result.current.openCreate());
    act(() => result.current.updateForm({ name: 'Two' }));
    await act(async () => {
      await result.current.onSave();
    });

    expect(result.current.formMessage).toBe('save exploded');
    expect(result.current.modalMode).toBe('create');
  });

  it('does nothing when called outside create or edit', async () => {
    const config = baseConfig();
    const { result } = await setup(config);

    await act(async () => {
      await result.current.onSave();
    });

    expect(config.create).not.toHaveBeenCalled();
    expect(config.update).not.toHaveBeenCalled();
  });
});

describe('useMaintenanceCrud — updateForm', () => {
  it('clears a field error as the field is edited', async () => {
    const { result } = await setup();

    act(() => result.current.openCreate());
    await act(async () => {
      await result.current.onSave();
    });
    expect(result.current.formErrors.name).toBeDefined();

    act(() => result.current.updateForm({ name: 'x' }));

    expect(result.current.formErrors.name).toBeUndefined();
  });

  it('re-validates live when revalidateOnChange is set', async () => {
    const { result } = await setup(baseConfig({ revalidateOnChange: true }));

    act(() => result.current.openCreate());
    act(() => result.current.updateForm({ name: '  ' }));

    expect(result.current.formErrors.name).toBe('Name is required.');

    act(() => result.current.updateForm({ name: 'valid' }));

    expect(result.current.formErrors.name).toBeUndefined();
  });
});

describe('useMaintenanceCrud — delete', () => {
  it('blocks deletion when the record has dependents, without opening the dialog', async () => {
    const config = baseConfig({ checkDependents: vi.fn().mockResolvedValue(true) });
    const { result } = await setup(config);

    await act(async () => {
      await result.current.openView({ id: 1, name: 'One' });
    });
    await act(async () => {
      await result.current.requestDelete();
    });

    expect(result.current.deleteBlocked).toBe(true);
    expect(result.current.deleteModalOpen).toBe(false);
  });

  it('opens the confirm dialog when there are no dependents', async () => {
    const config = baseConfig({ checkDependents: vi.fn().mockResolvedValue(false) });
    const { result } = await setup(config);

    await act(async () => {
      await result.current.openView({ id: 1, name: 'One' });
    });
    await act(async () => {
      await result.current.requestDelete();
    });

    expect(result.current.deleteBlocked).toBe(false);
    expect(result.current.deleteModalOpen).toBe(true);
  });

  it('deletes, reloads and closes the modal', async () => {
    const config = baseConfig();
    const { result } = await setup(config);

    await act(async () => {
      await result.current.openView({ id: 1, name: 'One' });
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(config.remove).toHaveBeenCalled();
    expect(config.search).toHaveBeenCalledTimes(2);
    expect(result.current.modalMode).toBeNull();
  });

  it('surfaces a delete failure and closes the dialog rather than hanging on it', async () => {
    const config = baseConfig({
      remove: vi.fn().mockRejectedValue(new Error('delete refused')),
    });
    const { result } = await setup(config);

    await act(async () => {
      await result.current.openView({ id: 1, name: 'One' });
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.formMessage).toBe('delete refused');
    expect(result.current.deleteModalOpen).toBe(false);
  });

  it('ignores delete requests with nothing selected', async () => {
    const config = baseConfig();
    const { result } = await setup(config);

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(config.remove).not.toHaveBeenCalled();
  });
});

describe('useMaintenanceCrud — edit lifecycle', () => {
  it('cancelEdit restores the selected record and returns to view', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.openView({ id: 1, name: 'One' });
    });
    act(() => result.current.openEdit());
    act(() => result.current.updateForm({ name: 'scratch' }));
    act(() => result.current.cancelEdit());

    expect(result.current.modalMode).toBe('view');
    expect(result.current.formState).toEqual({ name: 'One' });
  });

  it('resetForm restores the record while editing, and clears it while creating', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.openView({ id: 1, name: 'One' });
    });
    act(() => result.current.openEdit());
    act(() => result.current.updateForm({ name: 'scratch' }));
    act(() => result.current.resetForm());
    expect(result.current.formState).toEqual({ name: 'One' });

    act(() => result.current.openCreate());
    act(() => result.current.updateForm({ name: 'scratch' }));
    act(() => result.current.resetForm());
    expect(result.current.formState).toEqual({ name: '' });
  });
});
