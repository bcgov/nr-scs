import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';

import { SCALE_SITE_PRIORITY_CODE } from '@/services/scaleSites.service';

import ScaleSiteCreatePage from './index';

type ClientLocSearchMockProps = {
  labelText?: ReactNode;
  client: string;
  loc: string;
  onClientChange: (value: string) => void;
  onLocChange: (value: string) => void;
  clientInvalid?: boolean;
  clientInvalidText?: string;
  locInvalid?: boolean;
  locInvalidText?: string;
};

type DistrictSelectMockProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  labelText?: ReactNode;
  invalid?: boolean;
  invalidText?: string;
};

type DmsInputMockProps = {
  id: string;
  value: { degrees: string; minutes: string; seconds: string };
  onChange: (next: { degrees: string; minutes: string; seconds: string }) => void;
  labelText?: ReactNode;
  invalid?: boolean;
  invalidParts?: { degrees?: boolean; minutes?: boolean; seconds?: boolean };
  invalidMessages?: string[];
  invalidText?: string;
};

const mockNavigate = vi.fn();
const mockCreateScaleSite = vi.fn();
const mockGetScaleMethodTypeLov = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return Object.assign({}, actual, {
    ['useNavigate']: () => mockNavigate,
  });
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: {
    BASE: '',
    VERSION: '0',
    WITH_CREDENTIALS: true,
    CREDENTIALS: 'include',
    TOKEN: '',
    USERNAME: undefined,
    PASSWORD: undefined,
    HEADERS: undefined,
    ENCODE_PATH: undefined,
  },
  default: {
    scaleSites: {
      createScaleSite: (...args: unknown[]) => mockCreateScaleSite(...args),
    },
    lov: {
      getScaleMethodTypeLov: (...args: unknown[]) => mockGetScaleMethodTypeLov(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/ClientLocSearch', () => ({
  default: ({
    labelText,
    client,
    loc,
    onClientChange,
    onLocChange,
    clientInvalid,
    clientInvalidText,
    locInvalid,
    locInvalidText,
  }: ClientLocSearchMockProps) => (
    <div>
      <div>{labelText}</div>
      <input
        aria-label="Owner Client Number"
        value={client}
        onChange={(e) => onClientChange(e.target.value)}
        aria-invalid={clientInvalid ? 'true' : 'false'}
      />
      {clientInvalidText ? <div>{clientInvalidText}</div> : null}
      <input
        aria-label="Owner Loc"
        value={loc}
        onChange={(e) => onLocChange(e.target.value)}
        aria-invalid={locInvalid ? 'true' : 'false'}
      />
      {locInvalidText ? <div>{locInvalidText}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: ({ id = 'district', value, onChange, labelText, invalid, invalidText }: DistrictSelectMockProps) => (
    <div>
      <label htmlFor={id}>{labelText}</label>
      <select
        id={id}
        aria-label="Reg/Dist"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? 'true' : 'false'}
      >
        <option value="">Select</option>
        <option value="100">100 — Selkirk</option>
      </select>
      {invalidText ? <div>{invalidText}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/core/DmsInput', () => ({
  default: ({ value, onChange, labelText, invalid, invalidParts, invalidMessages, invalidText }: DmsInputMockProps) => {
    const partInvalid = (part: 'degrees' | 'minutes' | 'seconds') =>
      invalidParts ? Boolean(invalidParts[part]) : Boolean(invalid);
    const messages = invalidMessages && invalidMessages.length > 0 ? invalidMessages : invalidText ? [invalidText] : [];
    return (
      <div>
        <div>{labelText}</div>
        <input
          aria-label={`${labelText} Degrees`}
          value={value.degrees}
          onChange={(e) => onChange({ ...value, degrees: e.target.value })}
          aria-invalid={partInvalid('degrees') ? 'true' : 'false'}
        />
        <input
          aria-label={`${labelText} Minutes`}
          value={value.minutes}
          onChange={(e) => onChange({ ...value, minutes: e.target.value })}
          aria-invalid={partInvalid('minutes') ? 'true' : 'false'}
        />
        <input
          aria-label={`${labelText} Seconds`}
          value={value.seconds}
          onChange={(e) => onChange({ ...value, seconds: e.target.value })}
          aria-invalid={partInvalid('seconds') ? 'true' : 'false'}
        />
        {invalid && messages.length > 0
          ? messages.map((message, index) => <div key={index}>{message}</div>)
          : null}
      </div>
    );
  },
}));

describe('ScaleSiteCreatePage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);
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
    mockNavigate.mockReset();
    mockCreateScaleSite.mockReset();
    mockGetScaleMethodTypeLov.mockReset();
    mockGetScaleMethodTypeLov.mockResolvedValue([
      { code: 'W', description: 'Weight Scale' },
      { code: 'P', description: 'Piece Scale' },
      { code: 'C', description: 'Cruise Based' },
      { code: 'S', description: 'Special Forest Product' },
    ]);

    mockUseAuth.mockReturnValue(createAuthContextValue());
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    render(
      <MemoryRouter>
        <ScaleSiteCreatePage />
      </MemoryRouter>,
    );
  };

  const fillRequiredFields = async () => {
    fireEvent.change(screen.getByLabelText('Owner Client Number'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText('Reg/Dist'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('scale-site-name') as HTMLInputElement, {
      target: { value: 'MAIN YARD' },
    });
    fireEvent.change(document.getElementById('site-location-description') as HTMLTextAreaElement, {
      target: { value: 'Nanaimo, BC' },
    });

    await waitFor(() => {
      const select = document.getElementById('site-type-primary') as HTMLSelectElement;
      expect(select.querySelector('option[value="W"]')).not.toBeNull();
    });

    fireEvent.change(document.getElementById('site-type-primary') as HTMLSelectElement, { target: { value: 'W' } });
  };

  it('submits the create payload and navigates to the view page on success', async () => {
    mockCreateScaleSite.mockResolvedValue({ scaleSiteIdNmbr: 'SITE001' });

    renderPage();
    await fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    await waitFor(() => expect(mockCreateScaleSite).toHaveBeenCalledTimes(1));
    expect(mockCreateScaleSite).toHaveBeenCalledWith(
      expect.objectContaining({
        siteName: 'MAIN YARD',
        ownerClientNumber: '12345678',
        ownerClientLocnCode: '00',
        orgUnitNo: 100,
        siteLocation: 'Nanaimo, BC',
        scalingMethods: [{ scaleMethodTypeCode: 'W', scaleSitePriorityCode: SCALE_SITE_PRIORITY_CODE.PRIMARY }],
      }),
      'token',
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/view/SITE001'),
    );
  });

  it('blocks submit and shows local errors when required fields are missing', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    expect(mockCreateScaleSite).not.toHaveBeenCalled();
    expect(screen.queryByText('Save failed.')).toBeNull();
    expect(screen.getAllByText('Scale Site Name is required.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Primary site type is required.').length).toBeGreaterThan(0);
  });

  it('flags duplicate scaling method codes client-side', async () => {
    renderPage();
    await fillRequiredFields();

    fireEvent.change(document.getElementById('site-type-secondary') as HTMLSelectElement, { target: { value: 'W' } });
    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    expect(mockCreateScaleSite).not.toHaveBeenCalled();
    expect(screen.getAllByText('Site type codes must be distinct.').length).toBeGreaterThan(0);
  });

  it('rejects decimal seconds in the latitude input', async () => {
    renderPage();
    await fillRequiredFields();

    fireEvent.change(screen.getByLabelText('Latitude Degrees'), { target: { value: '49' } });
    fireEvent.change(screen.getByLabelText('Latitude Minutes'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Latitude Seconds'), { target: { value: '22.5' } });
    fireEvent.change(screen.getByLabelText('Longitude Degrees'), { target: { value: '-123' } });
    fireEvent.change(screen.getByLabelText('Longitude Minutes'), { target: { value: '56' } });
    fireEvent.change(screen.getByLabelText('Longitude Seconds'), { target: { value: '31' } });

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    expect(mockCreateScaleSite).not.toHaveBeenCalled();
    expect(screen.getAllByText('Latitude seconds must be an integer.').length).toBeGreaterThan(0);
  });

  it('lists a separate message for every invalid latitude sub-field at once', async () => {
    renderPage();
    await fillRequiredFields();

    // Minutes and seconds both out of range simultaneously.
    fireEvent.change(screen.getByLabelText('Latitude Degrees'), { target: { value: '49' } });
    fireEvent.change(screen.getByLabelText('Latitude Minutes'), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText('Latitude Seconds'), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText('Longitude Degrees'), { target: { value: '-123' } });
    fireEvent.change(screen.getByLabelText('Longitude Minutes'), { target: { value: '56' } });
    fireEvent.change(screen.getByLabelText('Longitude Seconds'), { target: { value: '31' } });

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    expect(mockCreateScaleSite).not.toHaveBeenCalled();
    // Both failures are shown, not just the first.
    expect(screen.getByText('Latitude minutes must be between 0 and 59.')).toBeTruthy();
    expect(screen.getByText('Latitude seconds must be between 0 and 59.')).toBeTruthy();
    // And they highlight only their own sub-fields, not degrees.
    expect(screen.getByLabelText('Latitude Degrees')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('Latitude Minutes')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Latitude Seconds')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the backend message when the create call fails', async () => {
    mockCreateScaleSite.mockRejectedValue({
      response: { data: { message: 'Owner client 12345678 / 00 does not exist.' } },
    });

    renderPage();
    await fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    await waitFor(() =>
      expect(screen.getByText('Owner client 12345678 / 00 does not exist.')).toBeTruthy(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
