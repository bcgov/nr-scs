import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import TemplatesAdminPage from './index';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetRegionDistrictLov = vi.fn();
const mockSearchActiveConditions = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    scaleAuthTemplates: {
      searchTemplates: (...args: unknown[]) => mockSearch(...args),
      getTemplate: (...args: unknown[]) => mockGet(...args),
      createTemplate: (...args: unknown[]) => mockCreate(...args),
      updateTemplate: (...args: unknown[]) => mockUpdate(...args),
      deleteTemplate: (...args: unknown[]) => mockDelete(...args),
    },
    scalerAuthorizations: {
      searchActiveScaleAuthConditions: (...args: unknown[]) => mockSearchActiveConditions(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
      getRegionDistrictLov: (...args: unknown[]) => mockGetRegionDistrictLov(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));

const listRow = { scaleAuthTemplateId: 9, scaleAuthTemplateName: 'My Template', scaleConditionClassCode: 'GEN', orgUnitNo: 1904 };
const detail = { ...listRow, conditions: [] };

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TemplatesAdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('TemplatesAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    [mockSearch, mockGet, mockCreate, mockUpdate, mockDelete, mockGetStaticLov, mockGetRegionDistrictLov, mockSearchActiveConditions].forEach(
      (m) => m.mockReset(),
    );
    mockSearch.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(detail);
    mockDelete.mockResolvedValue(undefined);
    mockGetStaticLov.mockResolvedValue([{ code: 'GEN', description: 'General' }]);
    mockGetRegionDistrictLov.mockResolvedValue([{ code: 1904, description: 'Chilliwack' }]);
    mockSearchActiveConditions.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      // An administrator: these cases exercise Add, Edit and Delete, which now name their own §J
      // permissions. Signed in as `undefined` they would pass for the wrong reason — nothing rendered.
      user: { roles: ['SCS_SYS_ADMIN'], privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);
  });

  it('renders the list', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'My Template' })).toBeInTheDocument();
  });

  it('opens the create modal with Save disabled until required fields are filled', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'My Template' });
    fireEvent.click(screen.getByRole('button', { name: /Add Template/ }));
    expect(await screen.findByText('Template - Create')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Record/ })).toBeDisabled();
  });

  it('opens Template Details and fetches the detail record', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'My Template' }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(9, 'token'));
    expect(await screen.findByText('Template Details')).toBeInTheDocument();
    expect(screen.getByText('Template Conditions')).toBeInTheDocument();
  });

  it('deletes through the confirm modal', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'My Template' }));
    await screen.findByText('Template Details');
    fireEvent.click(await screen.findByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(9, 'token'));
  });

  it('keeps Save disabled until name, type and org unit are all provided, then enables it', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'My Template' });
    fireEvent.click(screen.getByRole('button', { name: /Add Template/ }));
    await screen.findByText('Template - Create');

    const save = screen.getByRole('button', { name: /Save Record/ });
    expect(save).toBeDisabled();

    // Name alone: still disabled.
    fireEvent.change(document.getElementById('tmpl-name')!, { target: { value: 'New Template' } });
    expect(save).toBeDisabled();

    // Name + type: still disabled (org unit missing).
    fireEvent.change(document.getElementById('tmpl-type')!, { target: { value: 'GEN' } });
    expect(save).toBeDisabled();

    // All three required fields present: enabled.
    fireEvent.change(document.getElementById('tmpl-reg-dist')!, { target: { value: '1904' } });
    await waitFor(() => expect(save).toBeEnabled());
  });

  it('submits the selected conditions in the create payload', async () => {
    mockCreate.mockResolvedValue({ ...detail, scaleAuthTemplateId: 12 });
    mockSearchActiveConditions.mockResolvedValue([
      {
        scaleAuthConditionId: 101,
        scaleAuthConditionTitle: 'Condition A',
        ministryStandardInd: 'N',
        scaleAuthConditionDesc: 'A description',
      },
    ]);

    renderPage();
    await screen.findByRole('button', { name: 'My Template' });
    fireEvent.click(screen.getByRole('button', { name: /Add Template/ }));
    await screen.findByText('Template - Create');

    // Choosing a type triggers the conditions fetch for that type.
    fireEvent.change(document.getElementById('tmpl-type')!, { target: { value: 'GEN' } });
    await waitFor(() =>
      expect(mockSearchActiveConditions).toHaveBeenCalledWith({ scaleConditionClassCode: 'GEN' }, 'token'),
    );

    // Select the fetched condition via its checkbox.
    const checkbox = await screen.findByRole('checkbox', { name: 'Select condition 101' });
    fireEvent.click(checkbox);

    fireEvent.change(document.getElementById('tmpl-name')!, { target: { value: 'New Template' } });
    fireEvent.change(document.getElementById('tmpl-reg-dist')!, { target: { value: '1904' } });

    const save = screen.getByRole('button', { name: /Save Record/ });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          scaleAuthTemplateName: 'New Template',
          scaleConditionClassCode: 'GEN',
          orgUnitNo: 1904,
          conditions: expect.arrayContaining([expect.objectContaining({ scaleAuthConditionId: 101 })]),
        }),
        'token',
      ),
    );
  });

  it('gates empty required fields via the disabled Save button, not per-field errors', async () => {
    // Templates has no per-field validation text: with required fields blank the form is
    // gated solely by `isFormValid` (Save disabled). This pins that behaviour after the
    // removal of the never-fired `formErrors` invalid/invalidText wiring.
    renderPage();
    await screen.findByRole('button', { name: 'My Template' });
    fireEvent.click(screen.getByRole('button', { name: /Add Template/ }));
    await screen.findByText('Template - Create');

    const modal = document.querySelector('.templates__modal')!;
    // Carbon renders invalidText inside `.cds--form-requirement`; none should exist.
    expect(modal.querySelector('.cds--form-requirement')).toBeNull();
    // The only gate on empty required fields is the disabled Save button.
    expect(screen.getByRole('button', { name: /Save Record/ })).toBeDisabled();
  });
});
