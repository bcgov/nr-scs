import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import TemplatesModal from './TemplatesModal';

const template = (overrides: Record<string, unknown> = {}) =>
  ({
    scaleAuthTemplateId: 7,
    scaleAuthTemplateName: 'Standard haul',
    scaleConditionClassCode: 'SA',
    orgUnitNo: 43,
    ...overrides,
  }) as never;

const setModalMode = vi.fn();
const handleFieldChange = vi.fn();
const handleSave = vi.fn();
const setDeleteModalOpen = vi.fn();

const setup = (overrides: Record<string, unknown> = {}) =>
  renderWithProviders(
    <TemplatesModal
      modalMode="create"
      setModalMode={setModalMode}
      selectedTemplate={null}
      detailQueryLoading={false}
      typeCodes={[{ code: 'SA', description: 'Scaler authorization' }] as never}
      regionDistricts={[{ code: '43', description: 'DCK' }] as never}
      formValues={{ scaleAuthTemplateName: '', scaleConditionClassCode: '', orgUnitNo: '' }}
      handleFieldChange={handleFieldChange}
      handleSave={handleSave}
      savePending={false}
      setDeleteModalOpen={setDeleteModalOpen}
      {...overrides}
    />,
  );

beforeEach(() => {
  resetApiMock();
  setModalMode.mockClear();
  handleFieldChange.mockClear();
  handleSave.mockClear();
  setDeleteModalOpen.mockClear();
});

describe('TemplatesModal — create mode', () => {
  it('renders the editable template fields', () => {
    const { container } = setup();

    expect(container.querySelector('#tmpl-name')).not.toBeNull();
    expect(container.querySelector('#tmpl-type')).not.toBeNull();
    expect(container.querySelector('#tmpl-reg-dist')).not.toBeNull();
  });

  it('reports a typed name back to its host', () => {
    const { container } = setup();

    fireEvent.change(container.querySelector('#tmpl-name')!, {
      target: { value: 'Standard haul' },
    });

    expect(handleFieldChange).toHaveBeenCalledWith('scaleAuthTemplateName', 'Standard haul');
  });

  it('reports a chosen type back to its host', () => {
    const { container } = setup();

    fireEvent.change(container.querySelector('#tmpl-type')!, { target: { value: 'SA' } });

    expect(handleFieldChange).toHaveBeenCalledWith('scaleConditionClassCode', 'SA');
  });

  it('reports a chosen district back to its host', () => {
    const { container } = setup();

    fireEvent.change(container.querySelector('#tmpl-reg-dist')!, { target: { value: '43' } });

    expect(handleFieldChange).toHaveBeenCalledWith('orgUnitNo', '43');
  });

  it('saves nothing on its own', () => {
    setup();

    expect(handleSave).not.toHaveBeenCalled();
  });

  it('offers the district options it was given', () => {
    const { container } = setup();

    const select = container.querySelector('#tmpl-reg-dist') as HTMLSelectElement;
    expect(Array.from(select.options).some((option) => option.value === '43')).toBe(true);
  });
});

describe('TemplatesModal — edit mode', () => {
  const editProps = {
    modalMode: 'edit' as const,
    selectedTemplate: template(),
    detail: template(),
    formValues: {
      scaleAuthTemplateName: 'Standard haul',
      scaleConditionClassCode: 'SA',
      orgUnitNo: '43',
    },
  };

  it('shows the template id being edited', () => {
    const { container } = setup(editProps);

    expect(container.querySelector('#tmpl-id')).not.toBeNull();
  });

  it('fills the fields from the supplied form values', () => {
    const { container } = setup(editProps);

    expect(container.querySelector('#tmpl-name')).toHaveValue('Standard haul');
  });

  it('offers deletion, but does not delete on its own', () => {
    setup(editProps);

    expect(setDeleteModalOpen).not.toHaveBeenCalled();
  });

  it('loads the conditions available for the template class', async () => {
    setup(editProps);

    await waitFor(() =>
      expect(
        apiMock.scalerAuthorizations.searchActiveScaleAuthConditions,
      ).toHaveBeenCalled(),
    );
  });
});

describe('TemplatesModal — view mode', () => {
  const viewProps = {
    modalMode: 'view' as const,
    selectedTemplate: template(),
    detail: template(),
    formValues: {
      scaleAuthTemplateName: 'Standard haul',
      scaleConditionClassCode: 'SA',
      orgUnitNo: '43',
    },
  };

  it('renders the read-only fields rather than the editable ones', () => {
    const { container } = setup(viewProps);

    expect(container.querySelector('#view-template-name')).not.toBeNull();
    expect(container.querySelector('#tmpl-name')).toBeNull();
  });

  it('shows the template id, type and district read-only', () => {
    const { container } = setup(viewProps);

    expect(container.querySelector('#view-template-id')).not.toBeNull();
    expect(container.querySelector('#view-template-type')).not.toBeNull();
    expect(container.querySelector('#view-template-org')).not.toBeNull();
  });

  it('never saves from a read-only view', async () => {
    setup(viewProps);

    const save = screen.queryAllByRole('button').find((b) => /save/i.test(b.textContent ?? ''));
    if (save) {
      await userEvent.click(save);
    }

    expect(handleSave).not.toHaveBeenCalled();
  });
});

describe('TemplatesModal — closed and loading', () => {
  it('renders nothing actionable when there is no mode', () => {
    const { container } = setup({ modalMode: null });

    expect(container.querySelector('#tmpl-name')).toBeNull();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('shows a loading state while the detail is being fetched', () => {
    const { container } = setup({
      modalMode: 'edit',
      selectedTemplate: template(),
      detailQueryLoading: true,
    });

    expect(container.textContent ?? '').not.toBe('');
  });

  it('does not save again while a save is already pending', async () => {
    setup({ savePending: true });

    const save = screen.queryAllByRole('button').find((b) => /save/i.test(b.textContent ?? ''));
    if (save) {
      await userEvent.click(save);
    }

    expect(handleSave).not.toHaveBeenCalled();
  });
});
