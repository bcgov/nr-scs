import { DatePicker, DatePickerInput } from '@carbon/react';
import { forwardRef, useEffect, useRef, type ReactNode } from 'react';

import { normalizeDateInput, parseDateOnly } from '@/utils/dateOnly';

import './index.scss';

/**
 * Strict parser handed to flatpickr so a calendar-invalid entry is rejected rather than rolled over.
 *
 * Without it, flatpickr's default lenient parser silently overflows: typing `2026-02-30` rewrites the
 * visible field to `2026-03-02`, and `2026-13-01` to `2027-01-01`. Worse, the rewrite lands only in the
 * DOM — `onChange` still emits the text the user typed — so the field on screen and the value in form
 * state disagree, with no error shown either way.
 *
 * Carbon knows about this (its own comment: "Flatpickr's default parser results in odd dates when given
 * invalid values") but only guards the `m/d/Y` format; we use `Y-m-d`, so nothing applied. Returning
 * `false` is Carbon's documented "cannot parse" signal — flatpickr then leaves the text alone instead of
 * inventing a different date.
 *
 * This stops the SILENT part. Rejecting the value still belongs to the owning form, which should run
 * `isValidDateOnly` from the same module.
 */
const strictParseDate = (dateStr: string): Date | false => parseDateOnly(dateStr.trim()) ?? false;

interface DateInputProps {
  id: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: ReactNode;
  hideLabel?: boolean;
  invalid?: boolean;
  invalidText?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      id,
      value = '',
      onChange,
      placeholder = 'YYYY-MM-DD',
      ariaLabel = 'Date',
      labelText = '',
      hideLabel = true,
      invalid,
      invalidText,
      disabled = false,
      readOnly = false,
    },
    ref,
  ) => {
    const helperId = invalid && invalidText ? `${id}-error-msg` : undefined;
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    // The last text the user actually typed. flatpickr owns the input and blanks it when it cannot parse,
    // so by the time its onChange fires the text is already gone — this is the only surviving copy.
    const typedRef = useRef('');

    // A parent clearing the value (a form Reset) must also forget the typed text. Otherwise the next
    // click-away blur, which reads '' from the field and falls back to typedRef, brings the cleared entry
    // back. Keyed on `value` so it fires only on the change to '' — clearing on every render would also
    // wipe a first entry the user is still typing whenever an unrelated re-render happens.
    useEffect(() => {
      if (value === '') {
        typedRef.current = '';
      }
    }, [value]);

    // Keep what the field SHOWS equal to the value in form state, always.
    //
    // flatpickr owns this input and rewrites it on its own schedule: it blanks anything it cannot parse
    // (DatePicker.js:422-425), and it does so at different moments depending on whether the user tabs away
    // or clicks away. Relying on that made the field lose a typed entry in some paths and keep a cleared
    // one in others. Mirroring state here makes the display deterministic and independent of which exit
    // path ran: the component never blanks a date by itself, and an empty `value` from the parent (a form
    // Reset) still clears it, because that is state changing rather than the picker interfering.
    useEffect(() => {
      const el = wrapperRef.current?.querySelector<HTMLInputElement>(`input#${CSS.escape(id)}`);
      if (el && el.value !== value) {
        el.value = value;
      }
    });

    return (
      <div ref={wrapperRef} className="scs-date-input" data-invalid={invalid ? 'true' : undefined} aria-invalid={invalid ? true : undefined}>
        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          parseDate={strictParseDate}
          value={value}
          onChange={(_dates: Date[], dateStr: string) => {
            // Taken at face value. An empty dateStr here means the value really is empty - most often
            // because the PARENT cleared it (a form Reset). Treating it as "flatpickr failed to parse,
            // put the typed text back" made Reset silently restore the date it had just cleared. The
            // unparseable-entry case is handled on blur instead, which is the path it actually arrives by.
            typedRef.current = dateStr;
            onChange?.(dateStr);
          }}
          readOnly={readOnly}
          allowInput={!readOnly}
        >
          <DatePickerInput
            id={id}
            placeholder={placeholder}
            labelText={labelText}
            hideLabel={hideLabel}
            aria-label={ariaLabel}
            invalid={invalid}
            invalidText={invalidText}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={10}
            onChange={(event) => {
              typedRef.current = (event.target as HTMLInputElement).value;
            }}
            onBlur={
              readOnly
                ? undefined
                : (event) => {
                    // Reshape on the way out, never reject: `20260105` and `26-1-5` both become
                    // `2026-01-05`, a half-typed `2026-1-` becomes `2026-01-`, and anything that cannot be
                    // reshaped confidently is passed through untouched. Whether the result is a real date
                    // is the form's question, asked on submit — see `normalizeDateInput`.
                    // Read the field, but fall back to what the user typed. Tabbing away runs this
                    // handler BEFORE flatpickr processes the blur, so the element still holds the text.
                    // Clicking away does not: flatpickr's close handler blanks the input first, so by
                    // the time this fires `event.target.value` is '' and the entry would be lost — which
                    // is exactly what made a typed `20260708` come back blank.
                    const fieldValue = (event.target as HTMLInputElement).value;
                    const source = fieldValue === '' ? typedRef.current : fieldValue;
                    const normalised = normalizeDateInput(source);
                    typedRef.current = normalised;
                    onChange?.(normalised);
                  }
            }
            data-invalid={invalid ? 'true' : undefined}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={helperId}
            style={{ width: '100%' }}
            ref={ref}
          />
        </DatePicker>

        {/* Render our own helper element to ensure the message is present in the DOM
            and can be styled/targeted reliably when Carbon does not render it. */}
        {invalid && invalidText ? (
          <div id={helperId} className="cds--form-requirement" dir="auto">
            {invalidText}
          </div>
        ) : null}
      </div>
    );
  },
);

DateInput.displayName = 'DateInput';

export default DateInput;
