import { IconButton, Modal, SkeletonText } from '@carbon/react';
import { type FC, useState } from 'react';
import { createPortal } from 'react-dom';

import whoDidItIcon from '@/assets/img/whodidit.gif';
import { useAuth } from '@/context/auth/useAuth';
import type { AuditDetails } from '@/services/audit.types';

import './index.scss';

/**
 * The five audit fields carried on every SCS detail record. Any detail type that
 * exposes these (i.e. any `AuditDetails`) can be passed directly.
 */
export type WhoDidItAudit = AuditDetails;

interface Props {
  /** The record's audit fields. May be undefined while loading. */
  audit?: WhoDidItAudit | null;
  /** Show a skeleton in the popup while the record is being fetched. */
  loading?: boolean;
  /** Tooltip/heading label; defaults to "Who Did It". */
  label?: string;
}

/**
 * "Who Did It" audit popup (UC-SYS-005) — shows who last created/modified a record.
 *
 * The trigger is the legacy detective-hat icon (carried over from the original app's
 * `whodidit.gif`), sat next to the record's edit action. Renders nothing unless the
 * current user signed in through IDIR, mirroring the legacy taglib, which only emitted
 * the trigger for IDIR government users.
 *
 * Values come straight from the record (blank when absent) — no defaults are synthesized
 * (an unset revision count shows blank, not 0). Timestamps are the one formatted field:
 * the ISO date-time is rendered in Pacific (Vancouver) time in `YYYY-MM-DD hh:mm:ss` format.
 */

// Backend timestamps are absolute instants (UTC/offset-bearing ISO-8601). Pacific (Vancouver)
// time is what BC users expect to see, so we convert rather than showing the raw UTC clock.
const VANCOUVER_TIME_ZONE = 'America/Vancouver';

/**
 * Formats a date-time for display as `YYYY-MM-DD hh:mm:ss`. When the value is an absolute
 * instant (carries a `Z` or `±hh:mm` offset), it is converted to Pacific (Vancouver) time;
 * the `sv-SE` locale yields exactly the `YYYY-MM-DD hh:mm:ss` 24-hour shape. A value without a
 * timezone (e.g. an already-formatted string) is shown by its own components, unshifted.
 * Returns the value unchanged if it doesn't look like a date-time, and '' when absent.
 */
/**
 * An ISO-8601 date-time carrying a zone: `2026-01-31T14:30:22[.123]Z` or `…+07:00`. Anchored at
 * both ends and built only from fixed-width pieces, so matching is linear — the previous floating
 * `.*` before the offset could rescan a long value once per starting position.
 */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const isInstant = ISO_INSTANT.test(value);
  if (isInstant) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('sv-SE', {
        timeZone: VANCOUVER_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  }
  const match = value.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : value;
};
const WhoDidIt: FC<Props> = ({ audit, loading = false, label = 'Who Did It?' }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Legacy parity: the trigger only appears for IDIR (government) users.
  if (user?.idpProvider !== 'IDIR') {
    return null;
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: 'When Created:', value: formatDateTime(audit?.entryTimestamp) },
    { label: 'Who Created:', value: audit?.entryUserid ?? '' },
    { label: 'When Updated:', value: formatDateTime(audit?.updateTimestamp) },
    { label: 'Who Updated:', value: audit?.updateUserid ?? '' },
    {
      label: 'Revision Count:',
      value: audit?.revisionCount != null ? String(audit.revisionCount) : '',
    },
  ];

  return (
    <>
      <IconButton
        label={label}
        kind="ghost"
        size="sm"
        align="bottom"
        onClick={() => setOpen(true)}
      >
        <img src={whoDidItIcon} alt="" width={20} height={20} />
      </IconButton>
      {/* Portal to <body> so the dialog centers on the viewport even when the trigger lives
          inside another Carbon modal (whose transformed container would otherwise re-base
          the nested modal's position: fixed onto the parent modal's box). */}
      {createPortal(
        <Modal
          open={open}
          className="who-did-it-modal"
          modalHeading={label}
          primaryButtonText="Close"
          aria-label="Who Did It audit details"
          onRequestSubmit={() => setOpen(false)}
          onRequestClose={() => setOpen(false)}
        >
          {loading ? (
            <SkeletonText paragraph lineCount={5} />
          ) : (
            <dl className="who-did-it__list" aria-label="Audit fields">
              {rows.map((row) => (
                <div className="who-did-it__row" key={row.label}>
                  <dt className="who-did-it__label">{row.label}</dt>
                  <dd className="who-did-it__value">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Modal>,
        document.body,
      )}
    </>
  );
};

export default WhoDidIt;
