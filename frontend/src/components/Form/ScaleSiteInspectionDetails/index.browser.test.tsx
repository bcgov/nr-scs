// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ScaleSiteInspectionDetails from './index';

vi.mock('@/components/core/DateInput', () => ({
  default: ({
    id,
    value = '',
    onChange,
    labelText,
    hideLabel = true,
    invalid = false,
    invalidText,
  }: {
    id: string;
    value?: string;
    onChange?: (value: string) => void;
    labelText?: React.ReactNode;
    hideLabel?: boolean;
    invalid?: boolean;
    invalidText?: string;
  }) => (
    <>
      {hideLabel ? null : <label htmlFor={id}>{labelText}</label>}
      <input
        id={id}
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {invalid && invalidText ? <div>{invalidText}</div> : null}
    </>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('ScaleSiteInspectionDetails', () => {
  const baseProps = {
    displayValues: {
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteLocation: 'Nanaimo',
      siteOwnerName: 'ACME FOREST PRODUCTS LTD.',
      inspectionTypeDescription: 'Compliance',
      siteTypeDisplay: 'Weight Scale',
      previousInspectionId: 12001,
      recipient: 'Jordan Smith',
      inspectionId: 12345,
    },
    formValues: {
      previousInspectionId: '12001',
      recipient: '77',
      siteOperatorPresentInd: 'Y',
      inspector: 'guid-123',
      inspectionDate: '2026-03-10',
      comments: 'General comments',
    },
    errors: {},
    recipientOptions: [{ value: '77', label: 'Jordan Smith' }],
    disabled: false,
    requiredIndicatorClassName: 'required-marker',
    onFieldChange: vi.fn(),
  } as const;

  it('renders a visible Inspection Date label in create mode', () => {
    render(
      <ScaleSiteInspectionDetails
        {...baseProps}
        mode="create"
      />,
    );

    expect(screen.getAllByLabelText(/Inspection Date/i).length).toBeGreaterThan(0);
  });

  it('renders a visible Inspection Date label in edit mode', () => {
    render(
      <ScaleSiteInspectionDetails
        {...baseProps}
        mode="edit"
      />,
    );

    expect(screen.getAllByLabelText(/Inspection Date/i).length).toBeGreaterThan(0);
  });

  it('renders read-only detail fields in view mode', () => {
    render(
      <ScaleSiteInspectionDetails
        {...baseProps}
        mode="view"
        displayValues={{
          ...baseProps.displayValues,
          siteOperatorPresentDescription: 'Yes',
          inspector: 'Jordan Smith',
          inspectionDate: '2026-03-10',
          comments: 'General comments',
        }}
      />,
    );

    expect((screen.getByLabelText('Site Operator present during Inspection') as HTMLInputElement).value).toBe('Yes');
    expect((screen.getByLabelText('Inspection Date') as HTMLInputElement).value).toBe('2026-03-10');
    expect((screen.getByLabelText('General Comments') as HTMLTextAreaElement).value).toBe('General comments');
    expect(screen.queryByRole('combobox', { name: /Site Operator present during Inspection/i })).toBeNull();
  });
});


