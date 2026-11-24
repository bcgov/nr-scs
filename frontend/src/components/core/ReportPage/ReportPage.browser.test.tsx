import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

import ReportPage from './index';

/**
 * Direct tests for ReportPage.handleSend — the client-side email/preview validation the letter and report
 * screens all inherit. These guards run BEFORE outputOptions.onSend, so a blocked submit must not call it.
 * (The letter E2E covers this end-to-end; this is the fast component-level guard, incl. the invalid-email
 * arm that had no assertion anywhere.)
 */

const Harness = ({ onSend }: { onSend: () => void }) => {
  const [email, setEmail] = useState('');
  const [preview, setPreview] = useState('Yes');
  return (
    <ReportPage
      title="Report"
      formClassName="test-form"
      isLoading={false}
      outputOptions={{
        emailRecipient: email,
        onEmailRecipientChange: setEmail,
        previewReport: preview,
        onPreviewChange: setPreview,
        onSend,
        showHeading: true,
      }}
    >
      <div />
    </ReportPage>
  );
};

const renderHarness = (onSend = vi.fn()) => {
  render(
    <MemoryRouter>
      <Harness onSend={onSend} />
    </MemoryRouter>,
  );
  return onSend;
};

const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

describe('ReportPage output validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an invalid email and does not call onSend', () => {
    const onSend = renderHarness();

    fireEvent.change(document.getElementById('email-recipient') as HTMLInputElement, {
      target: { value: 'not-an-email' },
    });
    send();

    expect(screen.getByText('Email Recipient must be a valid email address.')).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('requires an email when Preview Report is No, and does not call onSend', () => {
    const onSend = renderHarness();

    fireEvent.click(document.querySelector('label[for="preview-no"]') as HTMLElement);
    send();

    expect(
      screen.getByText('If Preview Report has been set to No then the Email Recipient is required.'),
    ).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onSend when Preview is Yes and email is blank (email optional)', () => {
    const onSend = renderHarness();

    send();

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('If Preview Report has been set to No then the Email Recipient is required.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Email Recipient must be a valid email address.')).not.toBeInTheDocument();
  });

  it('calls onSend when a valid email is provided', () => {
    const onSend = renderHarness();

    fireEvent.change(document.getElementById('email-recipient') as HTMLInputElement, {
      target: { value: 'user@example.com' },
    });
    send();

    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
