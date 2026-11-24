import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';
import type { PageableResponse } from '@/components/Form/TableResource/types';

import RiskAssessmentSearchLayout from './RiskAssessmentSearchLayout';

type Row = { id: string; level: string };

const content: PageableResponse<Row> = {
  content: [{ id: '1', level: 'High' }],
  page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
};

const baseProps = {
  pageClassName: 'scaler-risk-assessment-page',
  formClassName: 'scaler-risk-assessment-form',
  notificationClassName: 'scaler-risk-assessment-notification',
  resultsClassName: 'scaler-risk-assessment-results',
  title: 'Queries - Scaler Risk Assessment',
  subtitle: 'Search scaler risk assessments by parameters.',
  breadCrumbs: [{ name: 'Scaler Risk Assessment' }],
  lovError: null,
  serverError: null,
  onDismissServerError: vi.fn(),
  filtersOpen: true,
  onToggleFilters: vi.fn(),
  disabled: false,
  riskQuestionnaireId: '',
  riskTypeCode: '',
  completeInd: '',
  riskLevelOptions: [{ value: 'H', label: 'High' }],
  onInputChange: vi.fn(),
  children: <div data-testid="own-filters" />,
  sortOptions: [{ value: '1', label: 'Assessment ID' }],
  primarySort: '1',
  secondarySort: '',
  onPrimarySortChange: vi.fn(),
  onSecondarySortChange: vi.fn(),
  onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
  onReset: vi.fn(),
  tableHeaders: [{ key: 'level' as const, header: 'Level', selected: true }],
  content,
  tableLoading: false,
  tableError: false,
  onPageChange: vi.fn(),
};

describe('RiskAssessmentSearchLayout', () => {
  it('renders the three filters both screens share', () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} />);

    expect(screen.getByLabelText('Assessment ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Complete')).toBeInTheDocument();
  });

  it("renders the screen's own filters alongside the shared ones", () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} />);

    expect(screen.getByTestId('own-filters')).toBeInTheDocument();
  });

  it('offers only Yes/No plus a blank for Complete', () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} />);

    const complete = screen.getByLabelText('Complete');
    expect([...complete.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      '',
      'Yes',
      'No',
    ]);
  });

  it('populates Level from the supplied LOV options', () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} />);

    expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument();
  });

  it('submits through the form rather than a button click handler', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onReset from the Reset button', () => {
    const onReset = vi.fn();
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows the LOV failure notice when dropdowns could not load', () => {
    renderWithProviders(
      <RiskAssessmentSearchLayout {...baseProps} lovError="LOV service down" />,
    );

    expect(screen.getByText('Could not load dropdown options')).toBeInTheDocument();
    expect(screen.getByText('LOV service down')).toBeInTheDocument();
  });

  it('shows a dismissible search failure', () => {
    const onDismissServerError = vi.fn();
    renderWithProviders(
      <RiskAssessmentSearchLayout
        {...baseProps}
        serverError="Search blew up"
        onDismissServerError={onDismissServerError}
      />,
    );

    expect(screen.getByText('Search failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onDismissServerError).toHaveBeenCalled();
  });

  it('disables the actions and the shared filters while busy', () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} disabled />);

    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByLabelText('Assessment ID')).toBeDisabled();
  });

  it('renders the results table with the supplied headers', () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} />);

    expect(screen.getByRole('columnheader', { name: 'Level' })).toBeInTheDocument();
  });

  it('renders the current-page breadcrumb as plain text, not a link', () => {
    renderWithProviders(<RiskAssessmentSearchLayout {...baseProps} />);

    expect(screen.getByText('Scaler Risk Assessment')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Scaler Risk Assessment' })).toBeNull();
  });
});
