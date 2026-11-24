import { FormLabel, TextInput } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

import './index.scss';

export type DmsValue = {
  degrees: string;
  minutes: string;
  seconds: string;
};

/** Per-sub-field error flags. When supplied, each sub-field is highlighted independently. */
export type DmsInvalidParts = {
  degrees?: boolean;
  minutes?: boolean;
  seconds?: boolean;
};

interface Props {
  id: string;
  labelText: ReactNode;
  value: DmsValue;
  onChange: (next: DmsValue) => void;
  degreesPlaceholder?: string;
  minutesPlaceholder?: string;
  secondsPlaceholder?: string;
  /**
   * Maximum number of *digits* in each part. Legacy `createScaleSite.jsp` capped these with
   * `maxlength`: 2 for latitude degrees, 3 for longitude degrees, 2 for every minutes and seconds
   * field. Counting digits rather than characters is what lets `allowSign` add a sign on top.
   */
  degreesDigits?: number;
  minutesDigits?: number;
  secondsDigits?: number;
  /**
   * Lets degrees carry a leading `-` (negative = W/S), which does not count against
   * `degreesDigits`. Legacy coordinates were unsigned, so a character cap of 3 was enough for a
   * 3-digit longitude; this app's DMS is signed, and a character cap would silently truncate
   * `-123` to `-12` -- a different, in-range point that then fails the BC check. Minutes and
   * seconds are always 0-59, so they never take a sign.
   */
  allowSign?: boolean;
  invalid?: boolean;
  /**
   * Highlights only the specific offending sub-field(s). When omitted, the whole
   * group falls back to `invalid` so every sub-field lights up together.
   */
  invalidParts?: DmsInvalidParts;
  /**
   * One message per invalid sub-field, each shown on its own line. When empty/omitted
   * the single `invalidText` is shown instead (e.g. a whole-group or cross-field error).
   */
  invalidMessages?: string[];
  invalidText?: string;
}

// Keeps at most `digits` digits, preserving a leading `-` when the field allows one, so a paste or
// a programmatic set cannot put an over-length value into form state either.
const capDigits = (raw: string, digits: number, allowSign: boolean) => {
  const negative = allowSign && raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  return `${negative ? '-' : ''}${body.slice(0, digits)}`;
};

// A sign is one more character the field must hold, but not one more digit.
const fieldMaxLength = (digits: number, allowSign: boolean) => digits + (allowSign ? 1 : 0);

const DmsInput: FC<Props> = ({
  id,
  labelText,
  value,
  onChange,
  degreesPlaceholder = 'Deg',
  minutesPlaceholder = 'Min',
  secondsPlaceholder = 'Sec',
  degreesDigits = 3,
  minutesDigits = 2,
  secondsDigits = 2,
  allowSign = false,
  invalid,
  invalidParts,
  invalidMessages,
  invalidText,
}) => {
  // Per-part flags win when provided; otherwise every sub-field mirrors the group `invalid`.
  const partInvalid = (part: keyof DmsInvalidParts): boolean =>
    invalidParts ? Boolean(invalidParts[part]) : Boolean(invalid);

  // Prefer the per-sub-field list (one line each); fall back to the single message.
  const messages =
    invalidMessages && invalidMessages.length > 0
      ? invalidMessages
      : invalidText
        ? [invalidText]
        : [];

  return (
    <>
      <FormLabel style={{ marginBottom: '8px' }}>{labelText}</FormLabel>
      <div className="dms-input-row" aria-label={typeof labelText === 'string' ? labelText : undefined}>
        <div className="dms-input-part">
          <TextInput
            id={`${id}-degrees`}
            value={value.degrees}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, degrees: capDigits(e.target.value, degreesDigits, allowSign) })}
            placeholder={degreesPlaceholder}
            labelText=""
            maxLength={fieldMaxLength(degreesDigits, allowSign)}
            invalid={partInvalid('degrees')}
          />
          <span className="dms-input-suffix" aria-hidden="true">
            °
          </span>
        </div>

        <div className="dms-input-part">
          <TextInput
            id={`${id}-minutes`}
            value={value.minutes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, minutes: capDigits(e.target.value, minutesDigits, false) })}
            placeholder={minutesPlaceholder}
            labelText=""
            maxLength={fieldMaxLength(minutesDigits, false)}
            invalid={partInvalid('minutes')}
          />
          <span className="dms-input-suffix" aria-hidden="true">
            '
          </span>
        </div>

        <div className="dms-input-part">
          <TextInput
            id={`${id}-seconds`}
            value={value.seconds}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, seconds: capDigits(e.target.value, secondsDigits, false) })}
            placeholder={secondsPlaceholder}
            labelText=""
            maxLength={fieldMaxLength(secondsDigits, false)}
            invalid={partInvalid('seconds')}
          />
          <span className="dms-input-suffix" aria-hidden="true">
            &quot;
          </span>
        </div>
      </div>

      {invalid && messages.length > 0 ? (
        <div className="dms-input-error" role="alert">
          {messages.map((message, index) => (
            <div key={index}>{message}</div>
          ))}
        </div>
      ) : null}
    </>
  );
};

export default DmsInput;
