import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';

import ReportOutputOptions from './index';

/**
 * `components/core/ReportOutputOptions` — the File Format / Email Recipient / Preview Report block shared by
 * every report screen and the MSD letter options screen.
 *
 * Its behaviour under a report screen (validation messages appearing, controls disabling while a report
 * generates) is already covered through its parent in `../ReportPage/index.browser.test.tsx`. What is covered
 * HERE is what only shows up when the component is driven directly: its two OPTIONAL renderings — the file
 * format select is omitted unless a change handler is supplied, and the heading can be suppressed — plus the
 * exact option/value contract its callbacks emit, which is what the parent screens map onto `outputFormat`
 * and `preview`.
 */
describe('ReportOutputOptions', () => {
  it('renders the file format, email and preview controls', () => {
    render(
      <ReportOutputOptions
        fileFormat="PDF"
        onFileFormatChange={vi.fn()}
        emailRecipient=""
        onEmailRecipientChange={vi.fn()}
        previewReport="Yes"
        onPreviewChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('File Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Recipient')).toBeInTheDocument();
    expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    expect(screen.getByLabelText('No')).toBeInTheDocument();
    expect(screen.getByText('Provide Report Output Options')).toBeInTheDocument();
  });

  it('offers exactly the two documented file formats', () => {
    // The screens map these labels onto the API's `outputFormat` ("MS Excel" → "XLS"), so an added or
    // renamed option here would silently produce an unmapped format.
    render(
      <ReportOutputOptions fileFormat="PDF" onFileFormatChange={vi.fn()} previewReport="Yes" />,
    );

    const options = Array.from(
      screen.getByLabelText('File Format').querySelectorAll('option'),
    ).map((option) => option.textContent);

    expect(options).toEqual(['PDF', 'MS Excel']);
  });

  it('omits the file format select when no change handler is supplied', () => {
    // The MSD letter options screen renders this block without a format choice.
    render(<ReportOutputOptions emailRecipient="" onEmailRecipientChange={vi.fn()} previewReport="Yes" />);

    expect(screen.queryByLabelText('File Format')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email Recipient')).toBeInTheDocument();
  });

  it('suppresses its heading when asked', () => {
    render(
      <ReportOutputOptions
        fileFormat="PDF"
        onFileFormatChange={vi.fn()}
        previewReport="Yes"
        showHeading={false}
      />,
    );

    expect(screen.queryByText('Provide Report Output Options')).not.toBeInTheDocument();
  });

  it('reports the chosen file format, typed email and preview selection', () => {
    const onFileFormatChange = vi.fn();
    const onEmailRecipientChange = vi.fn();
    const onPreviewChange = vi.fn();

    render(
      <ReportOutputOptions
        fileFormat="PDF"
        onFileFormatChange={onFileFormatChange}
        emailRecipient=""
        onEmailRecipientChange={onEmailRecipientChange}
        previewReport="Yes"
        onPreviewChange={onPreviewChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('File Format'), { target: { value: 'MS Excel' } });
    fireEvent.change(screen.getByLabelText('Email Recipient'), {
      target: { value: 'reports@example.gov.bc.ca' },
    });
    fireEvent.click(screen.getByLabelText('No'));

    expect(onFileFormatChange).toHaveBeenCalledWith('MS Excel');
    expect(onEmailRecipientChange).toHaveBeenCalledWith('reports@example.gov.bc.ca');
    // The screens compare this against the literal 'Yes' to derive `preview`, so the emitted value matters.
    expect(onPreviewChange).toHaveBeenCalledWith('No');
  });

  it('defaults Preview Report to Yes when the parent supplies no value', () => {
    render(<ReportOutputOptions fileFormat="PDF" onFileFormatChange={vi.fn()} />);

    expect(screen.getByLabelText('Yes')).toBeChecked();
    expect(screen.getByLabelText('No')).not.toBeChecked();
  });

  it('renders a validation message as an alert', () => {
    render(
      <ReportOutputOptions
        fileFormat="PDF"
        onFileFormatChange={vi.fn()}
        emailRecipient=""
        onEmailRecipientChange={vi.fn()}
        previewReport="No"
        validationError="Email Recipient must be a valid email address."
      />,
    );

    // role="alert" is what makes the message announced rather than merely visible — the only accessible
    // signal a keyboard/screen-reader user gets that their send was refused.
    //
    // Queried by TEXT rather than by role: Carbon's own form controls each render a hidden
    // role="alert" requirement span, so `getByRole('alert')` matches several elements and is ambiguous.
    const error = screen.getByText('Email Recipient must be a valid email address.');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveClass('report-output-email-error');
  });

  it('renders no validation message when there is none to show', () => {
    const { container } = render(
      <ReportOutputOptions fileFormat="PDF" onFileFormatChange={vi.fn()} previewReport="Yes" />,
    );

    // Same reason as above — assert on THIS component's error element, not on the role, which Carbon's
    // own controls also use.
    expect(container.querySelector('.report-output-email-error')).toBeNull();
  });

  it('disables every control when disabled', () => {
    render(
      <ReportOutputOptions
        fileFormat="PDF"
        onFileFormatChange={vi.fn()}
        emailRecipient=""
        onEmailRecipientChange={vi.fn()}
        previewReport="Yes"
        onPreviewChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText('File Format')).toBeDisabled();
    expect(screen.getByLabelText('Email Recipient')).toBeDisabled();
    expect(screen.getByLabelText('Yes')).toBeDisabled();
    expect(screen.getByLabelText('No')).toBeDisabled();
  });
});
