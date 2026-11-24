import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import { PageTitleProvider } from '@/context/pageTitle/PageTitleProvider';

import ReportPage from './index';

/**
 * `components/core/ReportPage` — the shared shell behind all nine Reports-tab screens AND the MSD letter
 * options screen. Worth testing here rather than nine times over: the email/preview validation that decides
 * whether ANY report request is dispatched lives in this one `handleSend`, so a regression here breaks every
 * report at once, and a per-screen test would only ever re-cover it.
 *
 * NOT covered here (deliberately): the actual blob download from `useReportDownload`. Triggering a real
 * browser download and reading the saved filename is not something this harness can observe — it is covered
 * end-to-end instead, in the e2e suite's
 * `features/rpt/uc-rpt-010-scaler-register/delivery.feature` (server-supplied filename vs the
 * `.pdf`/`.xls` fallback), which drives a real browser download event.
 */

/**
 * ReportPage is fully CONTROLLED — the parent owns every output-option value and passes setters down. A
 * stateless render would therefore freeze the inputs and make the "error clears when the input becomes
 * valid" effect untestable, so this harness supplies the state the real screens supply.
 */
const Harness = ({
  onSend,
  onValidationError,
  onReset,
  onBack,
  sendDisabled,
  initialPreview = 'Yes',
  initialEmail = '',
  ...overrides
}: {
  onSend?: () => void;
  onValidationError?: (message: string) => void;
  // These three live inside `outputOptions`, NOT on ReportPage itself — they are named explicitly here so
  // they cannot be spread onto the wrong prop object (which silently renders no Back/Reset button at all).
  onReset?: () => void;
  onBack?: () => void;
  sendDisabled?: boolean;
  initialPreview?: string;
  initialEmail?: string;
  [key: string]: unknown;
}) => {
  const [fileFormat, setFileFormat] = useState('PDF');
  const [emailRecipient, setEmailRecipient] = useState(initialEmail);
  const [previewReport, setPreviewReport] = useState(initialPreview);

  // MemoryRouter + PageTitleProvider are both required by the `PageTitle` that ReportPage renders:
  // PageTitle calls `useNavigate()` (for breadcrumbs) and `usePageTitle()`.
  return (
    <MemoryRouter>
      <PageTitleProvider>
        <ReportPage
          title="Test Report"
          formClassName="test-report-form"
          isLoading={false}
          outputOptions={{
            fileFormat,
            onFileFormatChange: setFileFormat,
            emailRecipient,
            onEmailRecipientChange: setEmailRecipient,
            previewReport,
            onPreviewChange: setPreviewReport,
            onSend,
            onValidationError,
            onReset,
            onBack,
            sendDisabled,
          }}
          {...overrides}
        >
          <div data-testid="report-parameters">parameters</div>
        </ReportPage>
      </PageTitleProvider>
    </MemoryRouter>
  );
};

const REQUIRED_EMAIL_MESSAGE =
  'If Preview Report has been set to No then the Email Recipient is required.';
const INVALID_EMAIL_MESSAGE = 'Email Recipient must be a valid email address.';

const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

describe('ReportPage', () => {
  describe('send validation', () => {
    it('blocks the send and reports the required-email rule when Preview is No and the email is blank', async () => {
      const onSend = vi.fn();
      const onValidationError = vi.fn();
      render(<Harness onSend={onSend} onValidationError={onValidationError} />);

      fireEvent.click(screen.getByLabelText('No'));
      send();

      expect(await screen.findByText(REQUIRED_EMAIL_MESSAGE)).toBeInTheDocument();
      // The prove-the-negative: the screens rely on onSend never firing, since that is what dispatches
      // the report request.
      expect(onSend).not.toHaveBeenCalled();
      expect(onValidationError).toHaveBeenCalledWith(REQUIRED_EMAIL_MESSAGE);
    });

    it('blocks the send and reports the format rule when the email is malformed', async () => {
      const onSend = vi.fn();
      const onValidationError = vi.fn();
      render(<Harness onSend={onSend} onValidationError={onValidationError} />);

      fireEvent.change(screen.getByLabelText('Email Recipient'), {
        target: { value: 'not-an-email' },
      });
      send();

      expect(await screen.findByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument();
      expect(onSend).not.toHaveBeenCalled();
      expect(onValidationError).toHaveBeenCalledWith(INVALID_EMAIL_MESSAGE);
    });

    it.each([
      'someone@email',
      'someone@.com',
      '@email.com',
      'someone@@email.com',
      'someone@email..com',
      'email me at someone@email.com',
    ])('blocks the send for the malformed address %s', async (value) => {
      const onSend = vi.fn();
      render(<Harness onSend={onSend} />);

      fireEvent.change(screen.getByLabelText('Email Recipient'), { target: { value } });
      send();

      expect(await screen.findByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument();
      expect(onSend).not.toHaveBeenCalled();
    });

    it('sends when Preview is Yes and no email is supplied', () => {
      // The default path: preview in the browser, no recipient needed.
      const onSend = vi.fn();
      render(<Harness onSend={onSend} />);

      send();

      expect(onSend).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(REQUIRED_EMAIL_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByText(INVALID_EMAIL_MESSAGE)).not.toBeInTheDocument();
    });

    it('sends when Preview is No and the email is valid', () => {
      const onSend = vi.fn();
      render(<Harness onSend={onSend} />);

      fireEvent.click(screen.getByLabelText('No'));
      fireEvent.change(screen.getByLabelText('Email Recipient'), {
        target: { value: 'reports@example.gov.bc.ca' },
      });
      send();

      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('validates a supplied email even when Preview is Yes', () => {
      // The format rule is not conditional on the delivery mode — a typo'd address is rejected even
      // though the report would have been previewed rather than emailed.
      const onSend = vi.fn();
      render(<Harness onSend={onSend} />);

      fireEvent.change(screen.getByLabelText('Email Recipient'), { target: { value: 'nope' } });
      send();

      expect(onSend).not.toHaveBeenCalled();
    });

    it('treats a whitespace-only email as blank when Preview is No', async () => {
      const onSend = vi.fn();
      render(<Harness onSend={onSend} />);

      fireEvent.click(screen.getByLabelText('No'));
      fireEvent.change(screen.getByLabelText('Email Recipient'), { target: { value: '   ' } });
      send();

      expect(await screen.findByText(REQUIRED_EMAIL_MESSAGE)).toBeInTheDocument();
      expect(onSend).not.toHaveBeenCalled();
    });

    it('does not render a Send button when the screen supplies no onSend', () => {
      render(<Harness onSend={undefined} />);

      expect(screen.queryByRole('button', { name: 'Send / View Report' })).not.toBeInTheDocument();
    });
  });

  describe('clearing the validation error', () => {
    it('clears the format error once the email becomes valid', async () => {
      render(<Harness onSend={vi.fn()} />);
      const email = screen.getByLabelText('Email Recipient');

      fireEvent.change(email, { target: { value: 'not-an-email' } });
      send();
      expect(await screen.findByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument();

      fireEvent.change(email, { target: { value: 'reports@example.gov.bc.ca' } });

      await waitFor(() => expect(screen.queryByText(INVALID_EMAIL_MESSAGE)).not.toBeInTheDocument());
    });

    it('clears the format error when the email is emptied', async () => {
      // Emptying is a valid resolution when Preview is Yes, so the error must not persist.
      render(<Harness onSend={vi.fn()} />);
      const email = screen.getByLabelText('Email Recipient');

      fireEvent.change(email, { target: { value: 'not-an-email' } });
      send();
      expect(await screen.findByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument();

      fireEvent.change(email, { target: { value: '' } });

      await waitFor(() => expect(screen.queryByText(INVALID_EMAIL_MESSAGE)).not.toBeInTheDocument());
    });

    it('clears the required-email error when Preview is switched back to Yes', async () => {
      render(<Harness onSend={vi.fn()} />);

      fireEvent.click(screen.getByLabelText('No'));
      send();
      expect(await screen.findByText(REQUIRED_EMAIL_MESSAGE)).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Yes'));

      await waitFor(() => expect(screen.queryByText(REQUIRED_EMAIL_MESSAGE)).not.toBeInTheDocument());
    });

    it('keeps the required-email error while the email is still blank and Preview is still No', async () => {
      // The effect must NOT clear an error the user has not actually resolved — asserted because the
      // clearing rules are guard clauses, the shape most prone to an inverted condition.
      render(<Harness onSend={vi.fn()} />);

      fireEvent.click(screen.getByLabelText('No'));
      send();
      expect(await screen.findByText(REQUIRED_EMAIL_MESSAGE)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Email Recipient'), { target: { value: '  ' } });

      await waitFor(() => expect(screen.getByText(REQUIRED_EMAIL_MESSAGE)).toBeInTheDocument());
    });

    it('keeps the format error while the email is still malformed', async () => {
      render(<Harness onSend={vi.fn()} />);
      const email = screen.getByLabelText('Email Recipient');

      fireEvent.change(email, { target: { value: 'not-an-email' } });
      send();
      expect(await screen.findByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument();

      fireEvent.change(email, { target: { value: 'still-not-an-email' } });

      await waitFor(() => expect(screen.getByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument());
    });
  });

  describe('notifications', () => {
    it('shows the generating notification while loading', () => {
      render(<Harness onSend={vi.fn()} isLoading />);

      expect(screen.getByText('Report Generating...')).toBeInTheDocument();
    });

    it('shows the success message a screen supplies', () => {
      render(<Harness onSend={vi.fn()} success="Report Generated" />);

      expect(screen.getByText('Report Generated')).toBeInTheDocument();
    });

    it('shows the submit-failure notification with the underlying reason', () => {
      render(<Harness onSend={vi.fn()} error="Request failed with status code 500" />);

      expect(screen.getByText('Unable to submit report')).toBeInTheDocument();
      expect(screen.getByText('Request failed with status code 500')).toBeInTheDocument();
    });

    it('shows no notification when idle', () => {
      render(<Harness onSend={vi.fn()} />);

      expect(screen.queryByText('Report Generating...')).not.toBeInTheDocument();
      expect(screen.queryByText('Unable to submit report')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables the actions and output options while loading', () => {
      render(<Harness onSend={vi.fn()} onReset={vi.fn()} onBack={vi.fn()} isLoading />);

      expect(screen.getByRole('button', { name: 'Send / View Report' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
      expect(screen.getByLabelText('Email Recipient')).toBeDisabled();
    });

    it('honours a screen-supplied sendDisabled without disabling the rest of the form', () => {
      // Screens use this to gate Send on their own parameter validity while leaving the form editable.
      render(<Harness onSend={vi.fn()} onReset={vi.fn()} sendDisabled />);

      expect(screen.getByRole('button', { name: 'Send / View Report' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
      expect(screen.getByLabelText('Email Recipient')).toBeEnabled();
    });
  });

  describe('layout', () => {
    it('renders the screen title, its parameters, and the output options', () => {
      render(<Harness onSend={vi.fn()} subtitle="Description: a test report" />);

      expect(screen.getByRole('heading', { level: 1, name: 'Test Report' })).toBeInTheDocument();
      expect(screen.getByText('Description: a test report')).toBeInTheDocument();
      expect(screen.getByTestId('report-parameters')).toBeInTheDocument();
      expect(screen.getByLabelText('File Format')).toBeInTheDocument();
      expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    });

    it('shows the default parameters heading, and a custom one when supplied', () => {
      const { unmount } = render(<Harness onSend={vi.fn()} />);
      expect(screen.getByText('Choose your report parameters.')).toBeInTheDocument();
      unmount();

      render(<Harness onSend={vi.fn()} parametersHeading="Pick your filters." />);
      expect(screen.getByText('Pick your filters.')).toBeInTheDocument();
    });

    it('omits the parameters heading for a screen with no parameters', () => {
      // The Scale Site Compliance report takes its subject from the route, so it passes false.
      render(<Harness onSend={vi.fn()} showParametersHeading={false} />);

      expect(screen.queryByText('Choose your report parameters.')).not.toBeInTheDocument();
    });

    it('renders the sort block only when a screen supplies one', () => {
      const sortOrder = {
        layout: 'form' as const,
        options: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
        ],
        primarySort: 'A',
        onPrimarySortChange: vi.fn(),
        secondarySort: '',
        onSecondarySortChange: vi.fn(),
      };

      const { unmount } = render(<Harness onSend={vi.fn()} />);
      expect(screen.queryByLabelText('Primary Sort')).not.toBeInTheDocument();
      unmount();

      render(<Harness onSend={vi.fn()} sortOrder={sortOrder} />);
      expect(screen.getByLabelText('Primary Sort')).toBeInTheDocument();
      expect(screen.getByLabelText('Secondary Sort')).toBeInTheDocument();
    });

    it('renders Back and Reset only when the screen supplies their handlers', () => {
      const { unmount } = render(<Harness onSend={vi.fn()} />);
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
      unmount();

      const onBack = vi.fn();
      const onReset = vi.fn();
      render(<Harness onSend={vi.fn()} onBack={onBack} onReset={onReset} />);

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
