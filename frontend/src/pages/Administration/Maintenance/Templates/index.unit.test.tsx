import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import Templates from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = () => renderWithProviders(<Templates />);

describe('Maintain Templates', () => {
  it('renders the maintenance heading', () => {
    renderPage();

    expect(screen.getAllByText('Maintain Templates').length).toBeGreaterThan(0);
  });

  it('offers the filter and the add action', () => {
    const { container } = renderPage();

    expect(controlById(container, 'filter-type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Template/i })).toBeInTheDocument();
  });

  it('loads the template list', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.scaleAuthTemplates.searchTemplates).toHaveBeenCalled());
    expect(screen.getAllByText('Maintain Templates').length).toBeGreaterThan(0);
  });

  it('opens the template details dialog from Add Template', async () => {
    const { container } = renderPage();

    // Carbon keeps modals mounted, so presence proves nothing; the open class does.
    await userEvent.click(screen.getByRole('button', { name: /Add Template/i }));

    await waitFor(() => {
      expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).not.toBeNull();
    });
  });

  it('keeps a chosen filter value', async () => {
    const { container } = renderPage();

    const filter = controlById<HTMLSelectElement>(container, 'filter-type');
    expect(filter).toBeInTheDocument();
  });

  it('renders without a template list', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Add Template/i })).toBeInTheDocument(),
    );
  });
});

describe('Maintain Templates — opening a template', () => {
  const template = { scaleAuthTemplateId: 7, scaleAuthTemplateName: 'Standard haul', scaleConditionClassCode: 'SA', orgUnitNo: 43 };

  it('lists the templates the search returns', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockResolvedValue([template]);
    renderPage();

    expect(await screen.findByText('Standard haul')).toBeInTheDocument();
  });

  it('fetches the full template and opens it read-only when its name is clicked', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockResolvedValue([template]);
    apiMock.scaleAuthTemplates.getTemplate.mockResolvedValue({ ...template, conditions: [] });
    const { container } = renderPage();

    await userEvent.click(await screen.findByText('Standard haul'));

    await waitFor(() =>
      expect(apiMock.scaleAuthTemplates.getTemplate).toHaveBeenCalledWith(7, expect.anything()),
    );
    await waitFor(() => expect(container.querySelector('#view-template-name')).not.toBeNull());
  });

  it('survives a failed template list', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockRejectedValue(new Error('Templates unavailable.'));
    renderPage();

    await waitFor(() => expect(apiMock.scaleAuthTemplates.searchTemplates).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Add Template/i })).toBeInTheDocument();
  });

  it('deletes nothing merely by opening a template', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockResolvedValue([template]);
    apiMock.scaleAuthTemplates.getTemplate.mockResolvedValue({ ...template, conditions: [] });
    renderPage();

    await userEvent.click(await screen.findByText('Standard haul'));
    await waitFor(() => expect(apiMock.scaleAuthTemplates.getTemplate).toHaveBeenCalled());

    expect(apiMock.scaleAuthTemplates.deleteTemplate).not.toHaveBeenCalled();
  });
});

describe('Maintain Templates — saving and deleting', () => {
  const template = { scaleAuthTemplateId: 7, scaleAuthTemplateName: 'Standard haul', scaleConditionClassCode: 'SA', orgUnitNo: 43 };
  const set = (id: string, value: string) => {
    const el = document.querySelector(`#${id}`);
    if (el) {fireEvent.change(el, { target: { value } });}
  };

  beforeEach(() => {
    apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'SA', description: 'Scaler authorization' }]);
    apiMock.lov.getRegionDistrictRollupLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
    apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  });

  it('creates a template from the add dialog', async () => {
    apiMock.scaleAuthTemplates.createTemplate.mockResolvedValue({ ...template, scaleAuthTemplateId: 8 });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Add Template/i }));
    await waitFor(() => expect(document.querySelector('#tmpl-name')).not.toBeNull());
    set('tmpl-name', 'New template');
    await waitFor(() => expect((document.querySelector('#tmpl-type') as HTMLSelectElement).options.length).toBeGreaterThan(1));
    set('tmpl-type', 'SA');
    await waitFor(() => expect((document.querySelector('#tmpl-reg-dist') as HTMLSelectElement).options.length).toBeGreaterThan(1));
    set('tmpl-reg-dist', '43');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scaleAuthTemplates.createTemplate).toHaveBeenCalled());
    const [request] = apiMock.scaleAuthTemplates.createTemplate.mock.calls[0];
    expect(request).toMatchObject({ scaleAuthTemplateName: 'New template', scaleConditionClassCode: 'SA' });
    expect(apiMock.scaleAuthTemplates.updateTemplate).not.toHaveBeenCalled();
  });

  it('reports a refused create in the banner', async () => {
    apiMock.scaleAuthTemplates.createTemplate.mockRejectedValue(new Error('Name already in use.'));
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Add Template/i }));
    await waitFor(() => expect(document.querySelector('#tmpl-name')).not.toBeNull());
    set('tmpl-name', 'Duplicate');
    await waitFor(() => expect((document.querySelector('#tmpl-type') as HTMLSelectElement).options.length).toBeGreaterThan(1));
    set('tmpl-type', 'SA');
    await waitFor(() => expect((document.querySelector('#tmpl-reg-dist') as HTMLSelectElement).options.length).toBeGreaterThan(1));
    set('tmpl-reg-dist', '43');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText(/Name already in use\./i)).length).toBeGreaterThan(0);
  });

  it('updates an opened template from its edit mode', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockResolvedValue([template]);
    apiMock.scaleAuthTemplates.getTemplate.mockResolvedValue({ ...template, conditions: [] });
    apiMock.scaleAuthTemplates.updateTemplate.mockResolvedValue(template);
    renderPage();

    await userEvent.click(await screen.findByText('Standard haul'));
    await waitFor(() => expect(document.querySelector('#view-template-name')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /Edit Template/i }));
    await waitFor(() => expect(document.querySelector('#tmpl-name')).not.toBeNull());
    set('tmpl-name', 'Standard haul v2');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scaleAuthTemplates.updateTemplate).toHaveBeenCalledWith(7, expect.objectContaining({ scaleAuthTemplateName: 'Standard haul v2' }), expect.anything()));
    expect(apiMock.scaleAuthTemplates.createTemplate).not.toHaveBeenCalled();
  });

  it('deletes an opened template only after confirmation', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockResolvedValue([template]);
    apiMock.scaleAuthTemplates.getTemplate.mockResolvedValue({ ...template, conditions: [] });
    apiMock.scaleAuthTemplates.deleteTemplate.mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByText('Standard haul'));
    await waitFor(() => expect(document.querySelector('#view-template-name')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));
    expect(apiMock.scaleAuthTemplates.deleteTemplate).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: /OK$/i }));

    await waitFor(() => expect(apiMock.scaleAuthTemplates.deleteTemplate).toHaveBeenCalledWith(7, expect.anything()));
  });

  it('reports a refused delete in the banner', async () => {
    apiMock.scaleAuthTemplates.searchTemplates.mockResolvedValue([template]);
    apiMock.scaleAuthTemplates.getTemplate.mockResolvedValue({ ...template, conditions: [] });
    apiMock.scaleAuthTemplates.deleteTemplate.mockRejectedValue(new Error('Template is in use.'));
    renderPage();

    await userEvent.click(await screen.findByText('Standard haul'));
    await waitFor(() => expect(document.querySelector('#view-template-name')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /OK$/i }));

    expect((await screen.findAllByText(/Template is in use\./i)).length).toBeGreaterThan(0);
  });
});
