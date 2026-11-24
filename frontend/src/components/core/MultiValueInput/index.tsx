import { FormLabel } from '@carbon/react';
import { type FC, type ReactNode, useCallback, useState } from 'react';

import './index.scss';

interface Props {
  id?: string;
  label: ReactNode;
  values: string[];
  onChange: (nextValues: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  /** Longest single value that can be typed (the input's `maxLength`). Unlimited when omitted. */
  maxLength?: number;
  disabled?: boolean;
  /**
   * Values to flag as invalid; matched case-insensitively. Any match renders the
   * offending pill(s) red and marks the field invalid (`data-invalid`), independent
   * of `invalidText`.
   */
  invalidValues?: string[];
  /**
   * Optional error message shown beneath the field when the field is invalid.
   * Purely the message — it does not, on its own, drive the invalid state; that is
   * driven by `invalidValues`.
   */
  invalidText?: string;
}

const MultiValueInput: FC<Props> = ({
  id = 'multi-value-input',
  label,
  values,
  onChange,
  placeholder,
  maxItems = 6,
  maxLength,
  disabled = false,
  invalidValues = [],
  invalidText,
}) => {
  const [inputValue, setInputValue] = useState('');
  const isMaxed = values.length >= maxItems;
  const invalidSet = new Set(invalidValues.map((value) => value.trim().toUpperCase()));
  const isInvalid = (value: string) => invalidSet.has(value.trim().toUpperCase());
  const hasError = invalidSet.size > 0;

  const addValue = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    if (isMaxed) {
      setInputValue('');
      return;
    }
    if (values.includes(trimmed)) {
      setInputValue('');
      return;
    }
    onChange([...values, trimmed]);
    setInputValue('');
  }, [inputValue, isMaxed, onChange, values]);

  const removeValue = useCallback((value: string) => {
    onChange(values.filter((item) => item !== value));
  }, [onChange, values]);

  return (
    <div className="multi-value-input">
      <FormLabel className="multi-value-input__label">{label}</FormLabel>
      <div
        className="multi-value-input__shell"
        aria-disabled={disabled || isMaxed}
        data-invalid={hasError ? 'true' : undefined}
      >
        {values.map((value) => (
          <span
            key={value}
            className={`multi-value-input__pill${isInvalid(value) ? ' multi-value-input__pill--invalid' : ''}`}
          >
            {value}
            <button
              type="button"
              className="multi-value-input__remove"
              onClick={() => removeValue(value)}
              disabled={disabled}
              aria-label={`Remove ${value}`}
            >
              x
            </button>
          </span>
        ))}
        <input
          id={id}
          className="multi-value-input__field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addValue();
            }
            if (e.key === 'Backspace' && !inputValue && values.length > 0) {
              removeValue(values[values.length - 1]);
            }
          }}
          onBlur={addValue}
          placeholder={values.length ? '' : placeholder}
          maxLength={maxLength}
          disabled={disabled || isMaxed}
        />
      </div>
      {hasError && invalidText && (
        <div className="multi-value-input__error" role="alert">
          {invalidText}
        </div>
      )}
    </div>
  );
};

export default MultiValueInput;
