import {
  Select,
  SelectItem,
  TextInput,
  RadioButtonGroup,
  RadioButton,
  Grid,
  Column,
} from '@carbon/react';
import { type FC } from 'react';
import './index.scss';

interface Props {
  fileFormat?: string;
  onFileFormatChange?: (value: string) => void;
  emailRecipient?: string;
  onEmailRecipientChange?: (value: string) => void;
  previewReport?: string;
  onPreviewChange?: (value: string) => void;
  validationError?: string | null;
  disabled?: boolean;
  showHeading?: boolean;
}

const ReportOutputOptions: FC<Props> = ({
  fileFormat,
  onFileFormatChange,
  emailRecipient = '',
  onEmailRecipientChange,
  previewReport = 'Yes',
  onPreviewChange,
  validationError,
  disabled = false,
  showHeading = true,
}: Props) => {
  return (
    <>
      {showHeading ? (
        <h4 style={{ marginBottom: '24px' }}>Provide Report Output Options</h4>
      ) : null}

      <Grid className="report-output-form scs__form__grid" style={{ rowGap: '32px' }}>
        {onFileFormatChange ? (
          <Column lg={8} md={4} sm={4}>
            <Select
              id="file-format"
              value={fileFormat}
              onChange={(e) => onFileFormatChange(e.target.value)}
              disabled={disabled}
              labelText="File Format"
            >
              <SelectItem value="PDF" text="PDF" />
              <SelectItem value="MS Excel" text="MS Excel" />
            </Select>
          </Column>
        ) : null}

        <Column lg={8} md={4} sm={4}>
          <TextInput
            id="email-recipient"
            value={emailRecipient}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEmailRecipientChange?.(e.target.value)}
            disabled={disabled}
            placeholder=""      
            labelText="Email Recipient"
          />
          {validationError ? (
            <p className="report-output-email-error" role="alert">
              {validationError}
            </p>
          ) : null}
        </Column>

        <Column lg={8} md={4} sm={4}>
          <RadioButtonGroup
            legendText="Preview Report"
            aria-label="Preview Report"
            name="preview"
            valueSelected={previewReport}
            // Both radio values below are strings, so Carbon's `string | number` selection is a string here.
            onChange={(value) => onPreviewChange?.(value as string)}
            disabled={disabled}
          >
            <RadioButton labelText="Yes" value="Yes" id="preview-yes" />
            <RadioButton labelText="No" value="No" id="preview-no" />
          </RadioButtonGroup>
        </Column>
      </Grid>
    </>
  );
};

export default ReportOutputOptions;
