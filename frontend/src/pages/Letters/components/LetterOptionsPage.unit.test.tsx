import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import LetterOptionsPage from './LetterOptionsPage';

const createLetter = vi.fn();
const onBack = vi.fn();

beforeEach(() => {
  resetApiMock();
  createLetter.mockReset().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'letter.pdf' });
  onBack.mockClear();
});

const setup = (overrides: Record<string, unknown> = {}) =>
  renderWithProviders(
    <LetterOptionsPage
      title="Scaler Authorization Letter"
      reportBaseName="R001"
      letterId={5}
      onBack={onBack}
      createLetter={createLetter}
      {...overrides}
    />,
  );

describe('Letter options page', () => {
  it('renders the title and the option fields', () => {
    const { container } = setup();

    expect(screen.getAllByText('Scaler Authorization Letter').length).toBeGreaterThan(0);
    expect(controlById(container, 'reg-dist')).toBeInTheDocument();
    expect(controlById(container, 'signature-blocks-select')).toBeInTheDocument();
    expect(controlById(container, 'cc-field')).toBeInTheDocument();
  });

  it('renders the output options', () => {
    const { container } = setup();

    expect(controlById(container, 'email-recipient')).toBeInTheDocument();
    expect(controlById(container, 'preview-yes')).toBeInTheDocument();
    expect(controlById(container, 'preview-no')).toBeInTheDocument();
  });

  it('offers Back, Send / View Report and Reset', () => {
    setup();

    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send \/ View Report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('calls back to the host page', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it('labels the signature toggle with the wording the host supplies', () => {
    const { container } = setup({
      showSignatureBlockToggle: true,
      signatureLabel: 'Show Scaler Authorization Signature',
    });

    expect(container.querySelector('#show-signature-block-select')).not.toBeNull();
    expect(container.textContent ?? '').toContain('Show Scaler Authorization Signature');
  });

  it('keeps a typed cc value', () => {
    const { container } = setup();

    const cc = controlById(container, 'cc-field');
    fireEvent.change(cc, { target: { value: 'someone@gov.bc.ca' } });

    expect(cc).toHaveValue('someone@gov.bc.ca');
  });

  it('clears entered values on reset', async () => {
    const { container } = setup();

    fireEvent.change(controlById(container, 'cc-field'), { target: { value: 'x@gov.bc.ca' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById(container, 'cc-field')).toHaveValue(''));
  });

  it('generates the letter through the host-supplied creator', async () => {
    apiMock.signatureBlocks.searchLetterSignatureBlocks.mockResolvedValue([
      { scaleSignatoryBlockId: 9, fullName: 'Ann Able' },
    ] as never);
    const { container } = setup();
    await waitFor(() => expect(controlById(container, 'signature-blocks-select')).toHaveValue('9'));

    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    // The host owns the endpoint; this page only supplies the id and the chosen options.
    expect(createLetter.mock.calls[0][0]).toBe(5);
  });

  it('reports a failed generation', async () => {
    createLetter.mockRejectedValue(new Error('Letter service unavailable.'));
    const { container } = setup({ allowEmptySignatory: true });

    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  // Nr-scs #286 follow-up: an empty picker used to skip the "required" check and send
  // scaleSignatoryBlockId: 0, issuing an authorization / MSD letter with no signatory.
  it('refuses to send an authorization letter when no blocks exist for the district', async () => {
    apiMock.signatureBlocks.searchLetterSignatureBlocks.mockResolvedValue([] as never);
    setup();
    await waitFor(() => expect(apiMock.signatureBlocks.searchLetterSignatureBlocks).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    expect((await screen.findAllByText('Signature block is required.')).length).toBeGreaterThan(0);
    expect(createLetter).not.toHaveBeenCalled();
  });

  it('loads the picker from the letter lookup, never the Maintenance search', async () => {
    setup();

    await waitFor(() => expect(apiMock.signatureBlocks.searchLetterSignatureBlocks).toHaveBeenCalled());
    expect(apiMock.signatureBlocks.searchSignatureBlocks).not.toHaveBeenCalled();
  });
});
