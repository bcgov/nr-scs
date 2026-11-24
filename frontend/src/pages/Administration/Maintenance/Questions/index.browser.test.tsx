import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import QuestionsAdminPage from './index';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetScaleMethodTypeLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    inspectionQuestions: {
      searchQuestions: (...args: unknown[]) => mockSearch(...args),
      getQuestion: (...args: unknown[]) => mockGet(...args),
      createQuestion: (...args: unknown[]) => mockCreate(...args),
      updateQuestion: (...args: unknown[]) => mockUpdate(...args),
      deleteQuestion: (...args: unknown[]) => mockDelete(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
      getScaleMethodTypeLov: (...args: unknown[]) => mockGetScaleMethodTypeLov(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));

const listRow = {
  inspectionQuestionId: 42,
  sortOrderNo: 1,
  inspectionTypeCodes: ['SITE'],
  questionText: 'Is the site tidy?',
};
const detail = {
  ...listRow,
  commentRequiredInd: 'N',
  effectiveDate: '2020-01-01',
  expiryDate: '2030-01-01',
  scalingMethodTypeCodes: ['WT'],
  validResponseCodes: ['Y', 'N'],
  questionUsed: false,
};

const renderPage = () => render(<QuestionsAdminPage />, { wrapper: MemoryRouter });

describe('QuestionsAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    [mockSearch, mockGet, mockCreate, mockUpdate, mockDelete, mockGetStaticLov, mockGetScaleMethodTypeLov].forEach((m) =>
      m.mockReset(),
    );
    mockSearch.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(detail);
    mockDelete.mockResolvedValue(undefined);
    mockGetStaticLov.mockImplementation((params: { tableKey?: string }) => {
      if (params?.tableKey === 'SCALE_SITE_INSPCTN_TYPE_CODE') {return Promise.resolve([{ code: 'SITE', description: 'Site Inspection' }]);}
      if (params?.tableKey === 'INSPECTION_ANSWER_CODE') {return Promise.resolve([{ code: 'Y', description: 'Yes' }, { code: 'N', description: 'No' }]);}
      return Promise.resolve([]);
    });
    mockGetScaleMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
    signedInAs(['SCS_SYS_ADMIN']);
  });

  /**
   * This harness signed in as `user: undefined` — no permissions at all — until §J's "Maintain
   * Questions" opened this page to the C&E Technician and its controls gained gates. The cases below
   * exercise Add, Edit Record and Delete, so they need a user who actually holds those verbs; without
   * one they would go green for the wrong reason (nothing rendered, nothing clicked).
   */
  function signedInAs(roles: string[]) {
    mockUseAuth.mockReturnValue({
      user: { roles, privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);
  }

  /**
   * §J gives the C&E Technician "Maintain Questions" `R` — the first non-administrator column to reach
   * any maintenance screen, and read-only. The route opens on `MAINTAIN_QUESTIONS_QUERY`, so every
   * control that does something else names its own verb.
   */
  describe('permission gating', () => {
    it('shows a C&E Technician the list with no Add, Edit or Delete', async () => {
      signedInAs(['SCS_CE_TECHNICIAN']);

      renderPage();

      // The read it is entitled to.
      const row = await screen.findByRole('button', { name: '42' });
      expect(screen.queryByRole('button', { name: /Add Question/ })).not.toBeInTheDocument();

      // ...including the detail record, which is its own §J `R` — but with no way to change it.
      fireEvent.click(row);
      await screen.findByText('Inspection Question - Details');
      expect(screen.queryByRole('button', { name: /Edit Record/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    });

    it('keeps all three for an administrator', async () => {
      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: '42' }));
      await screen.findByText('Inspection Question - Details');
      expect(screen.getByRole('button', { name: /Edit Record/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    });
  });

  it('renders the list, resolving the inspection-type label', async () => {
    const { container } = renderPage();
    expect(await screen.findByRole('button', { name: '42' })).toBeInTheDocument();
    await waitFor(() =>
      expect(container.querySelector('.table-resource__cell-content--inspectionTypeCodes')?.textContent).toBe('Site Inspection'),
    );
  });

  it('validates the create form', async () => {
    renderPage();
    await screen.findByRole('button', { name: '42' });
    fireEvent.click(screen.getByRole('button', { name: /Add Question/ }));
    await screen.findByText('Maintain Questions - Create');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Question is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('fetches the detail record on view and switches to edit', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '42' }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(42, 'token'));
    expect(await screen.findByText('Inspection Question - Details')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit Record/ }));
    expect(await screen.findByText('Maintain Questions - Edit')).toBeInTheDocument();
  });

  it('deletes through the confirm modal', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '42' }));
    await screen.findByText('Inspection Question - Details');
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(42, 'token'));
  });

  // --- Helpers for driving the real Carbon create form ---------------------

  const openCreate = async () => {
    renderPage();
    await screen.findByRole('button', { name: '42' });
    fireEvent.click(screen.getByRole('button', { name: /Add Question/ }));
    await screen.findByText('Maintain Questions - Create');
  };

  const setValue = (id: string, value: string) =>
    fireEvent.change(document.getElementById(id) as HTMLElement, { target: { value } });

  const setDate = (id: string, value: string) => {
    const input = document.getElementById(id) as HTMLElement;
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  // Open the FilterableMultiSelect (`msId` = its id), click the option whose
  // text matches (scoped to that menu so the native "Comment Required" Yes/No
  // options don't collide), then collapse it again.
  const pick = async (msId: string, optionText: string) => {
    await userEvent.click(document.getElementById(`${msId}-toggle-button`) as HTMLElement);
    const menu = document.getElementById(`${msId}__menu`) as HTMLElement;
    await userEvent.click(await within(menu).findByRole('option', { name: optionText }));
    await userEvent.click(document.getElementById(`${msId}-toggle-button`) as HTMLElement);
  };

  const fillValid = async ({
    sortOrder = '1',
    effective = '2030-06-15',
    expiry = '2030-06-15',
    responses = ['Yes', 'No'],
  }: { sortOrder?: string; effective?: string; expiry?: string; responses?: string[] } = {}) => {
    setValue('question-text', 'Is the load secured?');
    setValue('question-sort-order', sortOrder);
    setValue('comment-required', 'N');
    setDate('effective-date', effective);
    setDate('expiry-date', expiry);
    await pick('inspection-type', 'Site Inspection');
    await pick('scaling-methods', 'Weight');
    for (const response of responses) {
      await pick('valid-responses', response);
    }
  };

  it('allows expiry equal to the effective date', async () => {
    mockCreate.mockResolvedValue({});
    await openCreate();
    // effective === expiry: the strict `expiry < effective` guard must NOT trip.
    await fillValid({ effective: '2030-06-15', expiry: '2030-06-15' });
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(screen.queryByText('Expiry date must be on or after Effective date.')).not.toBeInTheDocument();
  });

  it('rejects a non-numeric sort order', async () => {
    await openCreate();
    await fillValid({ sortOrder: 'abc' });
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Sort order must be a whole number.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('requires at least two valid responses', async () => {
    mockCreate.mockResolvedValue({});
    await openCreate();
    await fillValid({ responses: ['Yes'] });
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Select at least two valid responses.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();

    // Selecting a second valid response clears the error and lets the save through.
    await pick('valid-responses', 'No');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  });

  it('locks all but Sort Order and Expiry when the question is in use', async () => {
    mockGet.mockResolvedValue({ ...detail, questionUsed: true });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '42' }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(42, 'token'));
    await screen.findByText('Inspection Question - Details');
    fireEvent.click(screen.getByRole('button', { name: /Edit Record/ }));
    await screen.findByText('Maintain Questions - Edit');

    // Read-only banner explaining the lock.
    expect(
      await screen.findByText(
        'This question has been used in an inspection. Only Sort Order and Expiry Date can be updated.',
      ),
    ).toBeInTheDocument();

    // Locked: multiselects collapse to read-only text inputs, plus comment /
    // effective date / question text are all disabled.
    expect(document.getElementById('inspection-type-readonly')).toBeDisabled();
    expect(document.getElementById('scaling-methods-readonly')).toBeDisabled();
    expect(document.getElementById('valid-responses-readonly')).toBeDisabled();
    expect(document.getElementById('question-text-readonly')).toBeDisabled();
    expect(document.getElementById('comment-required')).toBeDisabled();
    expect(document.getElementById('effective-date')).toBeDisabled();
    // The editable multiselect variants must not be rendered while locked.
    expect(document.getElementById('inspection-type')).toBeNull();

    // Still editable: Sort Order and Expiry Date.
    expect(document.getElementById('question-sort-order')).toBeEnabled();
    expect(document.getElementById('expiry-date')).toBeEnabled();
  });
});
