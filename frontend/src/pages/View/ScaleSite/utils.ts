import type { StaticLov } from '@/services/lov.service';
import type { ScaleSiteSummarySiteType } from '@/services/scaleSites.service';

export { asText, ynToDisplay } from '@/utils/display';

type SiteTypeSlot = 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

export interface ScaleSiteSiteTypeDisplayRow {
  slot: SiteTypeSlot;
  priorityCode: string;
  priorityDescription: string;
  scaleMethodTypeCode: string;
  scaleMethodTypeDescription: string;
}

const SITE_TYPE_SLOTS: Array<{
  slot: SiteTypeSlot;
  matchCodes: string[];
  fallbackPriorityCode: string;
  fallbackPriorityDescription: string;
}> = [
  {
    slot: 'PRIMARY',
    matchCodes: ['P', '1'],
    fallbackPriorityCode: 'P',
    fallbackPriorityDescription: 'Primary',
  },
  {
    slot: 'SECONDARY',
    matchCodes: ['S', '2'],
    fallbackPriorityCode: 'S',
    fallbackPriorityDescription: 'Secondary',
  },
  {
    slot: 'TERTIARY',
    matchCodes: ['T', '3'],
    fallbackPriorityCode: 'T',
    fallbackPriorityDescription: 'Tertiary',
  },
];

export function buildScaleSiteSiteTypeDisplayRows(
  siteTypes?: ScaleSiteSummarySiteType[] | null,
  priorityLovs?: StaticLov[] | null,
  scaleMethodTypeLovs?: StaticLov[] | null,
): ScaleSiteSiteTypeDisplayRow[] {
  return SITE_TYPE_SLOTS.map((slot) => {
    const matchedSiteType = (siteTypes ?? []).find((siteType) => {
      const normalizedPriorityCode = normalizeCode(siteType.priorityCode);
      return normalizedPriorityCode != null && slot.matchCodes.includes(normalizedPriorityCode);
    });

    const priorityCode = normalizeCode(matchedSiteType?.priorityCode) ?? slot.fallbackPriorityCode;
    const scaleMethodTypeCode = normalizeCode(matchedSiteType?.scaleMethodTypeCode) ?? '';

    return {
      slot: slot.slot,
      priorityCode,
      priorityDescription:
        findLovDescription(priorityLovs, priorityCode) ?? slot.fallbackPriorityDescription,
      scaleMethodTypeCode,
      scaleMethodTypeDescription:
        findLovDescription(scaleMethodTypeLovs, scaleMethodTypeCode) ?? scaleMethodTypeCode,
    };
  });
}

export function formatOwnerClientDisplay(
  clientNumber?: string | null,
  ownerClientLocnCode?: string | null,
): string {
  const normalizedClientNumber = clientNumber?.trim() ?? '';
  const normalizedLocnCode = ownerClientLocnCode?.trim() ?? '';

  if (!normalizedClientNumber && !normalizedLocnCode) {
    return '—';
  }

  if (!normalizedClientNumber) {
    return normalizedLocnCode;
  }

  if (!normalizedLocnCode) {
    return normalizedClientNumber;
  }

  return `${normalizedClientNumber} / ${normalizedLocnCode}`;
}

export function formatCoordinate(
  degrees?: number | null,
  minutes?: number | null,
  seconds?: number | null,
): string {
  if (degrees == null && minutes == null && seconds == null) {
    return '—';
  }

  const parts: string[] = [];

  if (degrees != null) {
    parts.push(`${degrees}°`);
  }

  if (minutes != null) {
    parts.push(`${minutes}′`);
  }

  if (seconds != null) {
    parts.push(`${seconds}″`);
  }

  return parts.join(' ');
}

export function firstErrorMessage(...errors: Array<Error | null | undefined>): string {
  for (const error of errors) {
    if (error?.message) {
      return error.message;
    }
  }

  return 'The scale site record could not be retrieved.';
}

function normalizeCode(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function findLovDescription(lovs: StaticLov[] | null | undefined, code: string): string | null {
  if (code.length === 0) {
    return '';
  }

  const normalizedCode = normalizeCode(code);
  if (normalizedCode == null) {
    return null;
  }

  const matchedLov = (lovs ?? []).find((lov) => normalizeCode(lov.code) === normalizedCode);
  const description = matchedLov?.description?.trim() ?? '';
  return description.length > 0 ? description : null;
}


