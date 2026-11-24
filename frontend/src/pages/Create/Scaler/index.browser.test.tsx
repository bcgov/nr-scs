import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as lovOptionsModule from '../../../hooks/useLovOptions';

import ScalerCreatePage from './index';

type ClientLocSearchMockProps = {
  labelText?: ReactNode;
  client: string;
  loc: string;
  onClientChange: (value: string) => void;
  onLocChange: (value: string) => void;
  clientId?: string;
  locId?: string;
  clientInvalid?: boolean;
  clientInvalidText?: string;
  locInvalid?: boolean;
  locInvalidText?: string;
  rowInvalidText?: string;
};

type DateInputMockProps = {
  id: string;
  value?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  invalid?: boolean;
  invalidText?: string;
};

type DistrictSelectMockProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  labelText?: ReactNode;
  invalid?: boolean;
  invalidText?: string;
};

const mockNavigate = vi.fn();
const mockCreateScaler = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return Object.assign({}, actual, {
    ['useNavigate']: () => mockNavigate,
  });
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scalers: {
      createScaler: (...args: unknown[]) => mockCreateScaler(...args),
    },
    lov: {
      getGradingCodeAppointmentTypeLov: vi.fn(),
      getScalerTrainingTypeLov: vi.fn(),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/pages/Queries/Client', () => ({
  default: () => <div>Client Search</div>,
}));

vi.mock('@/components/core/ClientLocSearch', () => ({
  default: ({
    labelText,
    client,
    loc,
    onClientChange,
    onLocChange,
    clientId = 'client',
    locId = 'loc',
    clientInvalid,
    clientInvalidText,
    locInvalid,
    locInvalidText,
    rowInvalidText,
  }: ClientLocSearchMockProps) => (
    <div>
      <div>{labelText}</div>
      <input
        id={clientId}
        aria-label="Scaler Client"
        value={client}
        onChange={(e) => onClientChange(e.target.value)}
        aria-invalid={rowInvalidText || clientInvalid ? 'true' : 'false'}
      />
      {clientInvalidText ? <div>{clientInvalidText}</div> : null}
      <input
        id={locId}
        aria-label="Scaler Location"
        value={loc}
        onChange={(e) => onLocChange(e.target.value)}
        aria-invalid={rowInvalidText || locInvalid ? 'true' : 'false'}
      />
      {locInvalidText ? <div>{locInvalidText}</div> : null}
      {rowInvalidText ? <div>{rowInvalidText}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/core/DateInput', () => ({
  default: ({ id, value = '', onChange, ariaLabel, invalid, invalidText }: DateInputMockProps) => (
    <div>
      <input
        id={id}
        aria-label={ariaLabel ?? id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={invalid ? 'true' : 'false'}
      />
      {invalidText ? <div>{invalidText}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: ({ id = 'district', value, onChange, labelText, invalid, invalidText }: DistrictSelectMockProps) => (
    <div>
      <label htmlFor={id}>{labelText}</label>
      <select
        id={id}
        aria-label="District"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? 'true' : 'false'}
      >
        <option value="">Select</option>
        <option value="1">District 1</option>
      </select>
      {invalidText ? <div>{invalidText}</div> : null}
    </div>
  ),
}));

describe('ScalerCreatePage', () => {
  let useLovOptionsCallCount = 0;
  const mockUseAuth = vi.mocked(authModule.useAuth);
  const mockUseLovOptions = vi.mocked(lovOptionsModule.useLovOptions);
  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    useLovOptionsCallCount = 0;
    mockNavigate.mockReset();
    mockCreateScaler.mockReset();
    mockCreateScaler.mockResolvedValue({ scalerLicenceNo: '1234' });

    mockUseAuth.mockReturnValue(createAuthContextValue());

    mockUseLovOptions.mockImplementation(() => {
      useLovOptionsCallCount += 1;

      if (useLovOptionsCallCount % 2 === 1) {
        return {
          data: [
            {
              code: '1',
              description: 'Official appointment',
              scalerAppointmentType: 'O',
              scaleGradingSystemCode: 'SG',
            },
          ],
          isLoading: false,
          error: null,
        };
      }

      return {
        data: [
          {
            code: '10',
            description: 'Initial exam',
            scalerTrainingClassCode: 'A',
          },
        ],
        isLoading: false,
        error: null,
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    render(
      <MemoryRouter>
        <ScalerCreatePage />
      </MemoryRouter>,
    );
  };

  const fillCoreFields = () => {
    fireEvent.change(screen.getByLabelText('Scaler Client'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText('District'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2025-01-15' } });
    fireEvent.change(document.getElementById('scaler-oath-taken') as HTMLSelectElement, { target: { value: 'Yes' } });
  };

  it('keeps location fixed at 00', () => {
    renderPage();

    const locationInput = screen.getByLabelText('Scaler Location') as HTMLInputElement;
    expect(locationInput.value).toBe('00');

    fireEvent.change(locationInput, { target: { value: '12' } });

    expect(locationInput.value).toBe('00');
  });

  it('highlights the missing appointment field and saves once the appointment path is complete', async () => {
    renderPage();
    fillCoreFields();

    fireEvent.change(document.getElementById('appointment') as HTMLSelectElement, { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Appointment Effective Date'), { target: { value: '2025-01-15' } });

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    expect(mockCreateScaler).not.toHaveBeenCalled();
    expect(screen.getAllByText('Province Wide is required.').length).toBeGreaterThan(0);

    const provinceWideSelect = document.getElementById('province-wide') as HTMLSelectElement;

    fireEvent.change(provinceWideSelect, { target: { value: 'Yes' } });

    await waitFor(() => {
      expect(screen.queryByText('Please fix the errors below.')).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    await waitFor(() => {
      expect(mockCreateScaler).toHaveBeenCalledWith(
        {
          clientNumber: '12345678',
          orgUnitNo: 1,
          issuedDate: '2025-01-15',
          oathTakenInd: 'Y',
          licenceTypes: ['SCS'],
          appointment: {
            scalerAppointmentType: 'O',
            scaleGradingSystemCode: 'SG',
            provinceWideInd: 'Y',
            issuedDate: '2025-01-15',
            expiryDate: undefined,
          },
          exam: undefined,
        },
        'token',
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scalers/view/1234');
    });
  });

  it('highlights the client field when the server reports the client already has a scaler', async () => {
    mockCreateScaler.mockRejectedValue({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for one or more fields.',
          fieldErrors: [
            { field: 'clientNumber', message: 'A scaler already exists for this client.' },
          ],
        },
      },
    });
    renderPage();
    fillCoreFields();
    fireEvent.change(document.getElementById('appointment') as HTMLSelectElement, { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Appointment Effective Date'), { target: { value: '2025-01-15' } });
    fireEvent.change(document.getElementById('province-wide') as HTMLSelectElement, { target: { value: 'Yes' } });

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    await waitFor(() => expect(mockCreateScaler).toHaveBeenCalledTimes(1));
    // Field-scoped message on the client input; the banner keeps its standard behavior
    await waitFor(() =>
      expect(screen.getAllByText('A scaler already exists for this client.').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('Please fix the errors below.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});







