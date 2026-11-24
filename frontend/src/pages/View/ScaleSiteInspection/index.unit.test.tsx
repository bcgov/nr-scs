import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewScaleSiteInspection from './index';

const detail = (overrides: Record<string, unknown> = {}) => ({
  inspectionId: 7,
  scaleSiteIdNmbr: 'SS-1',
  siteName: 'North Yard',
  inspectionTypeDescription: 'Routine',
  siteTypeDisplay: 'Weight',
  inspectionDate: '2026-01-01',
  inspector: 'F5E59074276C40558FF6A17CF1AB3EC2',
  inspectorName: 'Jane Smith',
  siteOperatorPresentInd: 'Y',
  questionResponses: [
    {
      inspectionQuestionId: 1,
      questionText: 'Is the deck clear?',
      answerOptions: [{ code: 'Y', description: 'Yes' }],
      inspectionAnswerCode: 'Y',
      followUpRequiredInd: 'N',
    },
  ],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.scaleSiteInspections.getScaleSiteInspectionDetail.mockResolvedValue(detail() as never);
});

const renderPage = (route = '/scale-sites/SS-1/inspections/view/7') =>
  renderWithProviders(<ViewScaleSiteInspection />, { route, path: '/scale-sites/:scaleSiteIdNmbr/inspections/view/:inspectionId' });
const loaded = () => waitFor(() => expect(screen.getByRole('button', { name: /^Back$/ })).toBeInTheDocument());
const confirmDelete = async () => {
  await userEvent.click(screen.getByRole('button', { name: /^danger Delete$/ }));
  const dialog = screen.getByText('Are you sure you want to delete this record?').closest('.cds--modal') as HTMLElement;
  await userEvent.click(within(dialog).getByRole('button', { name: /Delete$/ }));
};

describe('View Scale Site Inspection', () => {
  it('loads the inspection named in the route and shows its type', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.scaleSiteInspections.getScaleSiteInspectionDetail).toHaveBeenCalledWith(7, expect.anything()));
    expect((await screen.findAllByText(/Routine/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Is the deck clear\?/).length).toBeGreaterThan(0);
  });

  it('loads nothing for an id that is not a positive whole number', async () => {
    renderPage('/scale-sites/SS-1/inspections/view/abc');

    await waitFor(() => expect(screen.getAllByText(/Inspection/).length).toBeGreaterThan(0));
    expect(apiMock.scaleSiteInspections.getScaleSiteInspectionDetail).not.toHaveBeenCalled();
  });

  it('goes back to the scale site inspections tab', async () => {
    renderPage();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: /^Back$/ }));

    expect(navigate).toHaveBeenCalledWith('/scale-sites/view/SS-1?tab=inspections');
  });

  it('opens the edit screen and the compliance report', async () => {
    renderPage();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: /Edit/ }));
    expect(navigate).toHaveBeenCalledWith('/scale-sites/SS-1/inspections/edit/7');

    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/ }));
    expect(navigate).toHaveBeenCalledWith('/reports/scale-site-compliance/7');
  });

  it('deletes only after confirmation and returns to the scale site', async () => {
    apiMock.scaleSiteInspections.deleteScaleSiteInspection.mockResolvedValue(undefined);
    renderPage();
    await loaded();

    await confirmDelete();

    await waitFor(() => expect(apiMock.scaleSiteInspections.deleteScaleSiteInspection).toHaveBeenCalledWith(7, expect.anything()));
    expect(navigate).toHaveBeenCalledWith('/scale-sites/view/SS-1?tab=inspections');
  });

  it('reports a refused delete and lets the banner be closed', async () => {
    apiMock.scaleSiteInspections.deleteScaleSiteInspection.mockRejectedValue(new Error('Inspection is referenced.'));
    renderPage();
    await loaded();

    await confirmDelete();

    expect((await screen.findAllByText('Delete failed')).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);
    await waitFor(() => expect(screen.queryByText('Delete failed')).not.toBeInTheDocument());
  });

  it('surfaces a load failure', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionDetail.mockRejectedValue(new Error('Not found.'));
    renderPage();

    await waitFor(() => expect(apiMock.scaleSiteInspections.getScaleSiteInspectionDetail).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Is the deck clear\?/)).not.toBeInTheDocument());
  });
});
