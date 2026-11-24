import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import SignatureBlocksAdminPage from './index';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetRegionDistrictRollupLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    signatureBlocks: {
      searchSignatureBlocks: (...args: unknown[]) => mockSearch(...args),
      getSignatureBlock: (...args: unknown[]) => mockGet(...args),
      createSignatureBlock: (...args: unknown[]) => mockCreate(...args),
      updateSignatureBlock: (...args: unknown[]) => mockUpdate(...args),
      deleteSignatureBlock: (...args: unknown[]) => mockDelete(...args),
    },
    lov: { getRegionDistrictRollupLov: (...args: unknown[]) => mockGetRegionDistrictRollupLov(...args) },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));
// RegDistSelect loads its own LOV and is not what these tests exercise; stub it.
vi.mock('@/components/core/RegDistSelect', () => ({ default: () => <div>RegDistSelect</div> }));

const listRow = {
  scaleSignatoryBlockId: 5,
  firstName: 'Jane',
  lastName: 'Doe',
  signatureTitle: 'Manager',
  orgUnitNo: 1904,
  orgUnitDescription: 'Chilliwack',
};

const renderPage = () => render(<SignatureBlocksAdminPage />, { wrapper: MemoryRouter });

describe('SignatureBlocksAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    [mockSearch, mockGet, mockCreate, mockUpdate, mockDelete, mockGetRegionDistrictRollupLov].forEach((m) => m.mockReset());
    mockSearch.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(listRow);
    mockDelete.mockResolvedValue(undefined);
    mockGetRegionDistrictRollupLov.mockResolvedValue([{ code: 1904, orgUnitCode: 'DCK', description: 'Chilliwack' }]);
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

  it('renders the list with the composed full name', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
  });

  it('validates the create form', async () => {
    renderPage();
    await screen.findByRole('button', { name: '5' });
    fireEvent.click(screen.getByRole('button', { name: /Add Signatory/ }));
    await screen.findByText('Signature Block - Create');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('First Name is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('fetches the detail record on view and switches to edit', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '5' }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(5, 'token'));
    expect(await screen.findByText('Signature Block Details')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit Signatory/ }));
    expect(await screen.findByText('Signature Block - Edit')).toBeInTheDocument();
  });

  it('deletes through the confirm modal', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '5' }));
    await screen.findByText('Signature Block Details');
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(5, 'token'));
  });

  /**
   * §J's three Signatory rows are `RU (dist)` for the district and regional scaling managers — the one
   * maintenance area in the matrix with no `C`. So this page is the only one where a role edits records
   * it cannot add, which is why the Add button needed gating separately from Edit.
   */
  it('lets a District Scaling Manager edit a signatory but not add or delete one', async () => {
    mockUseAuth.mockReturnValue({
      user: { roles: ['SCS_DIST_SCALING_MANAGER'], privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);

    renderPage();

    // Reads the list, but §J gives it no C.
    fireEvent.click(await screen.findByRole('button', { name: '5' }));
    await screen.findByText('Signature Block Details');
    expect(screen.queryByRole('button', { name: /Add Signatory/ })).not.toBeInTheDocument();

    // Edit survives (the U); Delete does not — no §J row grants this column a D.
    expect(screen.getByRole('button', { name: /Edit Signatory/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });
});
