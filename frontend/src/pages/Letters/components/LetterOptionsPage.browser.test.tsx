import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';
import { PageTitleProvider } from '@/context/pageTitle/PageTitleProvider';

import LetterOptionsPage from './LetterOptionsPage';

const mockGetRegionDistrictRollupLov = vi.fn();
const mockSearchSignatureBlocks = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    lov: {
      getRegionDistrictRollupLov: (...args: unknown[]) => mockGetRegionDistrictRollupLov(...args),
    },
    signatureBlocks: {
      searchLetterSignatureBlocks: (...args: unknown[]) => mockSearchSignatureBlocks(...args),
    },
  },
}));

type Overrides = Partial<Parameters<typeof LetterOptionsPage>[0]>;

const renderPage = (overrides: Overrides = {}) => {
  const createLetter =
    overrides.createLetter ??
    vi.fn().mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'letter.pdf' });
  const onBack = overrides.onBack ?? vi.fn();

  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PageTitleProvider>
          <LetterOptionsPage
            title="Check Scale Advisory Letter Options"
            reportBaseName="Check-Scale-Advisory-Letter-123"
            letterId={123}
            onBack={onBack}
            createLetter={createLetter}
            {...overrides}
          />
        </PageTitleProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

  return { createLetter, onBack };
};

describe('LetterOptionsPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authContext = (): AuthContextType => ({
    user: undefined,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    mockGetRegionDistrictRollupLov.mockReset();
    mockSearchSignatureBlocks.mockReset();
    mockGetRegionDistrictRollupLov.mockResolvedValue([]);
    mockSearchSignatureBlocks.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(authContext());
  });

  it('hides the show-signature toggle when showSignatureBlockToggle is false (R004 / MSD)', async () => {
    renderPage({ showSignatureBlockToggle: false });

    // The always-present CC Text field confirms the form rendered.
    expect(await screen.findByLabelText('CC Text')).toBeInTheDocument();
    // The show-signature Select (default label) must not be present.
    expect(screen.queryByLabelText('Show Signature')).not.toBeInTheDocument();
  });

  it('renders the show-signature toggle with the provided label when shown', async () => {
    renderPage({ signatureLabel: 'Show Scaler Authorization Signature' });

    expect(
      await screen.findByLabelText('Show Scaler Authorization Signature'),
    ).toBeInTheDocument();
  });

  it('allows an empty signatory and delegates to createLetter (UC-RPT-002-S05)', async () => {
    const createLetter = vi
      .fn()
      .mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'letter.pdf' });

    renderPage({ showSignatureBlockToggle: false, allowEmptySignatory: true, createLetter });

    fireEvent.click(await screen.findByRole('button', { name: 'Send / View Report' }));

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    const payload = createLetter.mock.calls[0][1];
    expect(payload.scaleSignatoryBlockId).toBeUndefined();
    expect(payload.showSignatureBlockInd).toBeUndefined();
  });

  it('requires an email when preview is No (AC-5)', async () => {
    const createLetter = vi.fn();
    renderPage({ showSignatureBlockToggle: false, allowEmptySignatory: true, createLetter });

    fireEvent.click(await screen.findByLabelText('No'));
    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    expect(
      await screen.findByText(
        'If Preview Report has been set to No then the Email Recipient is required.',
      ),
    ).toBeInTheDocument();
    expect(createLetter).not.toHaveBeenCalled();
  });

  it('lets the user clear a signatory and still submit when allowEmptySignatory (AC-11)', async () => {
    mockSearchSignatureBlocks.mockResolvedValue([
      { scaleSignatoryBlockId: 88, fullName: 'Jane Doe', signatureTitle: 'Manager' },
    ]);
    const createLetter = vi
      .fn()
      .mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'letter.pdf' });

    renderPage({ showSignatureBlockToggle: false, allowEmptySignatory: true, createLetter });

    // The first block auto-selects once the list loads; then the user clears it.
    const signatorySelect = (await screen.findByLabelText('Select Letter Signature')) as HTMLSelectElement;
    await waitFor(() => expect(signatorySelect.value).toBe('88'));
    fireEvent.change(signatorySelect, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    expect(screen.queryByText('Signature block is required.')).not.toBeInTheDocument();
    expect(createLetter.mock.calls[0][1].scaleSignatoryBlockId).toBeUndefined();
  });

  // ── Scaler-authorization letter config: toggle shown, allowEmptySignatory FALSE (the default) ──

  it('requires a signature block when blocks exist and the selection is cleared', async () => {
    mockSearchSignatureBlocks.mockResolvedValue([
      { scaleSignatoryBlockId: 744, fullName: 'Zoe Allard', signatureTitle: 'Checkscaler' },
    ]);
    const createLetter = vi.fn();

    renderPage({ signatureLabel: 'Show Scaler Authorization Signature', createLetter });

    const signatorySelect = (await screen.findByLabelText('Select Letter Signature')) as HTMLSelectElement;
    await waitFor(() => expect(signatorySelect.value).toBe('744'));
    fireEvent.change(signatorySelect, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    expect(await screen.findByText('Signature block is required.')).toBeInTheDocument();
    expect(createLetter).not.toHaveBeenCalled();
  });

  it('includes showSignatureBlockInd=Y and the selected block in the payload', async () => {
    mockSearchSignatureBlocks.mockResolvedValue([
      { scaleSignatoryBlockId: 744, fullName: 'Zoe Allard', signatureTitle: 'Checkscaler' },
    ]);
    const createLetter = vi
      .fn()
      .mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'letter.pdf' });

    renderPage({ signatureLabel: 'Show Scaler Authorization Signature', createLetter });

    const signatorySelect = (await screen.findByLabelText('Select Letter Signature')) as HTMLSelectElement;
    await waitFor(() => expect(signatorySelect.value).toBe('744'));

    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    const payload = createLetter.mock.calls[0][1];
    expect(payload.showSignatureBlockInd).toBe('Y');
    expect(payload.scaleSignatoryBlockId).toBe(744);
  });

  // ── Nr-scs #286 follow-up: the lookup failing, or finding nothing, must never yield an unsigned letter ──

  it('shows a lookup failure and disables Send', async () => {
    mockSearchSignatureBlocks.mockRejectedValue(new Error('Request failed with status code 403'));
    const createLetter = vi.fn();

    renderPage({ signatureLabel: 'Show Scaler Authorization Signature', createLetter });

    expect(await screen.findByText('Unable to load signature blocks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send / View Report' })).toBeDisabled();
    expect(createLetter).not.toHaveBeenCalled();
  });

  it('requires a signature block on an authorization letter when none exist', async () => {
    mockSearchSignatureBlocks.mockResolvedValue([]);
    const createLetter = vi.fn();

    renderPage({ signatureLabel: 'Show Scaler Authorization Signature', createLetter });

    await waitFor(() => expect(mockSearchSignatureBlocks).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    expect(await screen.findByText('Signature block is required.')).toBeInTheDocument();
    expect(createLetter).not.toHaveBeenCalled();
  });
});
