import type { FC } from 'react';

/**
 * A plain `<input>` standing in for `@/components/core/DateInput` in component tests.
 *
 * The real one wraps Carbon's `DatePicker`, which is driven by flatpickr: it binds its own
 * listeners and reports changes as `(dates: Date[], dateStr: string)`. A synthetic `change` event
 * fired at the inner input never reaches that handler, so a test typing a date sees the form state
 * stay empty and the field come back "required" — a harness artefact, not a defect.
 *
 * Substituting the widget keeps the page's own validation and submission under test, which is what
 * these suites are actually about. Use it with:
 *
 *     vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));
 */
type Props = {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  labelText?: string;
  invalid?: boolean;
  invalidText?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
};

const DateInput: FC<Props> = ({
  id,
  value = '',
  onChange,
  labelText,
  invalid,
  invalidText,
  disabled,
  readOnly,
  placeholder,
}) => (
  <div className="scs-date-input" data-invalid={invalid ? 'true' : undefined}>
    {labelText ? <label htmlFor={id}>{labelText}</label> : null}
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid ? true : undefined}
      onChange={(event) => onChange?.(event.target.value)}
    />
    {invalid && invalidText ? <div>{invalidText}</div> : null}
  </div>
);

export default DateInput;
