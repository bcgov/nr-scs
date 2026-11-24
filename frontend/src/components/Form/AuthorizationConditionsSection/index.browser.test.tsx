import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';

import AuthorizationConditionsSection from './index';

const mockGetTemplates = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: () => Promise.resolve('token') }),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    lov: {
      getTemplates: (...args: unknown[]) => mockGetTemplates(...args),
    },
  },
}));

/**
 * The shared AuthorizationConditionsSection is embedded in MSD create/edit AND Scaler/Scale-Site auth. Its
 * add-by-id guards, template apply, and mandatory-remove block are pure handler/branch logic driven by two
 * injected props (searchConditions / getTemplateConditions) — ideal for unit coverage (previously none).
 */
const Harness = (props: {
  initial?: ScaleAuthCondition[];
  loadDefaults?: boolean;
  duplicateConditionMessage?: (conditionId: number) => string;
  searchConditions: (...args: unknown[]) => Promise<ScaleAuthCondition[]>;
  getTemplateConditions?: (...args: unknown[]) => Promise<ScaleAuthCondition[]>;
}) => {
  const [conditions, setConditions] = useState<ScaleAuthCondition[]>(props.initial ?? []);
  return (
    <MemoryRouter>
      <AuthorizationConditionsSection
        conditionClassCode="MSD"
        templateFilterField="MSD"
        conditions={conditions}
        setConditions={setConditions}
        duplicateConditionMessage={props.duplicateConditionMessage}
        loadDefaults={props.loadDefaults ?? false}
        searchConditions={props.searchConditions as never}
        getTemplateConditions={(props.getTemplateConditions ?? (() => Promise.resolve([]))) as never}
      />
    </MemoryRouter>
  );
};

const cond = (overrides: Partial<ScaleAuthCondition>): ScaleAuthCondition => ({
  scaleConditionClassCode: 'MSD',
  scaleAuthConditionId: 190,
  scaleAuthConditionTitle: 'TRANSPORTATION CUT-OFF',
  scaleAuthConditionDesc: 'desc',
  ministryStandardInd: 'N',
  sortOrderNo: 2,
  ...overrides,
});

describe('AuthorizationConditionsSection', () => {
  beforeEach(() => {
    mockGetTemplates.mockReset();
    mockGetTemplates.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('rejects a non-numeric condition number client-side without searching', async () => {
    const searchConditions = vi.fn().mockResolvedValue([]);
    render(<Harness searchConditions={searchConditions} />);

    fireEvent.change(document.getElementById('condition-id') as HTMLInputElement, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('Condition # must be a valid number.')).toBeInTheDocument();
    });
    expect(searchConditions).not.toHaveBeenCalled();
  });

  it('reports a valid-but-unknown condition number as not found', async () => {
    const searchConditions = vi.fn().mockResolvedValue([]);
    render(<Harness searchConditions={searchConditions} />);

    fireEvent.change(document.getElementById('condition-id') as HTMLInputElement, { target: { value: '999999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('Condition 999999 was not found.')).toBeInTheDocument();
    });
  });

  it('adds a found condition by number to the table', async () => {
    const searchConditions = vi.fn().mockResolvedValue([cond({ scaleAuthConditionId: 190 })]);
    render(<Harness searchConditions={searchConditions} />);

    fireEvent.change(document.getElementById('condition-id') as HTMLInputElement, { target: { value: '190' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('TRANSPORTATION CUT-OFF')).toBeInTheDocument();
    });
  });

  it('rejects a condition that is already in the list, with the default authorization wording', async () => {
    // ERR-015. The duplicate used to be swallowed by a silent de-dup inside the setConditions updater:
    // no message, and the input cleared as though the add had worked. Legacy blocked it with an inline
    // error, which is what QA reported missing.
    const searchConditions = vi.fn().mockResolvedValue([cond({ scaleAuthConditionId: 185 })]);
    render(<Harness initial={[cond({ scaleAuthConditionId: 185 })]} searchConditions={searchConditions} />);

    fireEvent.change(document.getElementById('condition-id') as HTMLInputElement, { target: { value: '185' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('The condition 185 has already been added.')).toBeInTheDocument();
    });

    // Rejected, so the table still holds exactly the one row. Waited for: the Add click raises a
    // minimum-duration loading state that swaps the body for two placeholder rows, so an immediate
    // row-count assertion would read the placeholders rather than the real content.
    await waitFor(() => {
      expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    });
    expect(document.querySelector('tbody')?.textContent).toContain('TRANSPORTATION CUT-OFF');
    // The entered value stays put to be corrected — the old silent path cleared it, which is precisely
    // what made a swallowed duplicate look like a successful add.
    expect(document.getElementById('condition-id')).toHaveValue('185');
  });

  it('uses a host-supplied duplicate message when the screen has its own legacy wording', async () => {
    // Mark Site Designation keys this message as `errors.dup_condition` ("Condition already exists for
    // Mark Site Designation."), which names the record type and takes no id — unlike the
    // `scaleSiteAuthorization.duplicateCondition` default asserted above. Hence the prop.
    const searchConditions = vi.fn().mockResolvedValue([cond({ scaleAuthConditionId: 185 })]);
    render(
      <Harness
        initial={[cond({ scaleAuthConditionId: 185 })]}
        duplicateConditionMessage={() => 'Condition already exists for Mark Site Designation.'}
        searchConditions={searchConditions}
      />,
    );

    fireEvent.change(document.getElementById('condition-id') as HTMLInputElement, { target: { value: '185' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('Condition already exists for Mark Site Designation.')).toBeInTheDocument();
    });
    expect(screen.queryByText('The condition 185 has already been added.')).not.toBeInTheDocument();
  });

  it('disables the remove button for a mandatory (ministry-standard) condition', async () => {
    const searchConditions = vi.fn().mockResolvedValue([]);
    render(
      <Harness
        searchConditions={searchConditions}
        initial={[cond({ scaleAuthConditionId: 185, ministryStandardInd: 'Y', scaleAuthConditionTitle: 'DIRECT TRANSPORTATION', sortOrderNo: 0 })]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('DIRECT TRANSPORTATION')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Remove condition 185' })).toBeDisabled();
  });

  it('applies a template and appends its conditions', async () => {
    const searchConditions = vi.fn().mockResolvedValue([]); // mount mandatory load returns none
    const getTemplateConditions = vi.fn().mockResolvedValue([cond({ scaleAuthConditionId: 191, scaleAuthConditionTitle: 'PRE-TRANSPORT LETTER DISTRIBUTION' })]);
    mockGetTemplates.mockResolvedValue([{ code: '443', description: 'MSDs' }]);

    render(<Harness searchConditions={searchConditions} getTemplateConditions={getTemplateConditions} loadDefaults />);

    // Wait for templates to populate the select, then choose + apply.
    await waitFor(() => {
      expect((document.getElementById('template-select') as HTMLSelectElement).querySelectorAll('option').length).toBeGreaterThan(1);
    });
    fireEvent.change(document.getElementById('template-select') as HTMLSelectElement, { target: { value: '443' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(screen.getByText('PRE-TRANSPORT LETTER DISTRIBUTION')).toBeInTheDocument();
    });
    expect(getTemplateConditions).toHaveBeenCalledWith(443, 'token');
  });
});
