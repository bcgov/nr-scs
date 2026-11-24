import { Column, Form, Grid, InlineNotification } from '@carbon/react';
import type { ComponentProps, FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import ReportOutputOptions from '@/components/core/ReportOutputOptions';
import SortOptions from '@/components/core/SortOptions';
import { isValidEmail } from '@/utils/email';

export type ReportOutputOptionsProps = ComponentProps<typeof ReportOutputOptions>;
export type SortOptionsProps = ComponentProps<typeof SortOptions>;

type ReportPageOutputOptions = ReportOutputOptionsProps & {
  onSend?: () => void;
  onReset?: () => void;
  onBack?: () => void;
  onValidationError?: (message: string) => void;
  sendDisabled?: boolean;
  layout?: 'boxed' | 'form';
};


interface Props {
  title: string;
  subtitle?: string;
  formClassName: string;
  isLoading: boolean;
  success?: string | null;
  error?: string | null;
  children: ReactNode;
  outputOptions: ReportPageOutputOptions;
  sortOrder?: SortOptionsProps | null;
  showParametersHeading?: boolean;
  parametersHeading?: string;
}

const ReportPage: FC<Props> = ({
  title,
  subtitle,
  formClassName,
  isLoading,
  success,
  error,
  children,
  outputOptions,
  sortOrder,
  showParametersHeading = true,
  parametersHeading = 'Choose your report parameters.',
}) => {
  const outputDisabled = outputOptions.disabled ?? isLoading;
  const sendDisabled = outputOptions.sendDisabled ?? outputDisabled;
  const [validationError, setValidationError] = useState<string | null>(null);
  const resolvedSortOrder = sortOrder
    ? { ...sortOrder, disabled: sortOrder.disabled ?? isLoading }
    : null;

  useEffect(() => {
    if (!validationError) {
      return;
    }

    const trimmedEmail = (outputOptions.emailRecipient ?? '').trim();

    if (outputOptions.previewReport === 'No' && !trimmedEmail) {
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return;
    }

    setValidationError(null);
  }, [outputOptions.emailRecipient, outputOptions.previewReport, validationError]);

  const handleSend = () => {
    const trimmedEmail = (outputOptions.emailRecipient ?? '').trim();

    if (outputOptions.previewReport === 'No' && !trimmedEmail) {
      const message = 'If Preview Report has been set to No then the Email Recipient is required.';
      setValidationError(message);
      outputOptions.onValidationError?.(message);
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      const message = 'Email Recipient must be a valid email address.';
      setValidationError(message);
      outputOptions.onValidationError?.(message);
      return;
    }

    setValidationError(null);
    outputOptions.onSend?.();
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title={title} subtitle={subtitle} />

        {isLoading ? (
          <InlineNotification kind="info" title="Report Generating..." lowContrast className="mt-4" />
        ) : null}

        {success ? (
          <InlineNotification kind="success" title={success} lowContrast className="mt-4" />
        ) : null}

        {error ? (
          <InlineNotification kind="error" title="Unable to submit report" subtitle={error} lowContrast className="mt-4" />
        ) : null}

        <Form onSubmit={(e) => e.preventDefault()} className={`report-form ${formClassName} scs__form${isLoading ? ' is-loading' : ''}`}>
          {showParametersHeading ? (
            <h4 className="scs__form__section-title">{parametersHeading}</h4>
          ) : null}

          {children}

          {resolvedSortOrder ? (
            <SortOptions {...resolvedSortOrder} />
          ) : null}

          <ReportOutputOptions
            fileFormat={outputOptions.fileFormat}
            onFileFormatChange={outputOptions.onFileFormatChange}
            emailRecipient={outputOptions.emailRecipient}
            onEmailRecipientChange={outputOptions.onEmailRecipientChange}
            previewReport={outputOptions.previewReport}
            onPreviewChange={outputOptions.onPreviewChange}
            validationError={validationError}
            disabled={outputDisabled}
            showHeading={outputOptions.showHeading}
          />

          <div className="scs__form__divider scs__form__divider--actions" />

          <div className="form-actions">
            {outputOptions.onBack ? (
              <Button kind="tertiary" onClick={outputOptions.onBack} disabled={outputDisabled}>
                Back
              </Button>
            ) : null}
            {outputOptions.onSend ? (
              <Button kind="primary" onClick={handleSend} disabled={sendDisabled}>
                Send / View Report
              </Button>
            ) : null}
            {outputOptions.onReset ? (
              <Button kind="secondary" onClick={outputOptions.onReset} disabled={outputDisabled}>
                Reset
              </Button>
            ) : null}
          </div>
        </Form>
      </Column>
    </Grid>
  );
};

export default ReportPage;
