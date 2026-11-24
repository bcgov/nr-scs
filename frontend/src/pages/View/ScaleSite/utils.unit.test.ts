import { describe, expect, it } from 'vitest';

import type { StaticLov } from '@/services/lov.service';
import type { ScaleSiteSummarySiteType } from '@/services/scaleSites.service';

import { buildScaleSiteSiteTypeDisplayRows } from './utils';

const priorityLovs: StaticLov[] = [
  { code: 'P', description: 'Primary' },
  { code: 'S', description: 'Secondary' },
  { code: 'T', description: 'Tertiary' },
];

const scaleMethodTypeLovs: StaticLov[] = [
  { code: 'P', description: 'Piece Scale' },
  { code: 'W', description: 'Weight Scale' },
];

describe('buildScaleSiteSiteTypeDisplayRows', () => {
  it('pads missing site type rows to legacy primary secondary tertiary slots', () => {
    const siteTypes: ScaleSiteSummarySiteType[] = [{ priorityCode: 'P', scaleMethodTypeCode: 'P' }];

    expect(buildScaleSiteSiteTypeDisplayRows(siteTypes, priorityLovs, scaleMethodTypeLovs)).toEqual([
      {
        slot: 'PRIMARY',
        priorityCode: 'P',
        priorityDescription: 'Primary',
        scaleMethodTypeCode: 'P',
        scaleMethodTypeDescription: 'Piece Scale',
      },
      {
        slot: 'SECONDARY',
        priorityCode: 'S',
        priorityDescription: 'Secondary',
        scaleMethodTypeCode: '',
        scaleMethodTypeDescription: '',
      },
      {
        slot: 'TERTIARY',
        priorityCode: 'T',
        priorityDescription: 'Tertiary',
        scaleMethodTypeCode: '',
        scaleMethodTypeDescription: '',
      },
    ]);
  });

  it('supports legacy-equivalent numeric priority codes when matching persisted rows', () => {
    const siteTypes: ScaleSiteSummarySiteType[] = [
      { priorityCode: '1', scaleMethodTypeCode: 'W' },
      { priorityCode: '3', scaleMethodTypeCode: 'P' },
    ];

    expect(buildScaleSiteSiteTypeDisplayRows(siteTypes, priorityLovs, scaleMethodTypeLovs)).toEqual([
      {
        slot: 'PRIMARY',
        priorityCode: '1',
        priorityDescription: 'Primary',
        scaleMethodTypeCode: 'W',
        scaleMethodTypeDescription: 'Weight Scale',
      },
      {
        slot: 'SECONDARY',
        priorityCode: 'S',
        priorityDescription: 'Secondary',
        scaleMethodTypeCode: '',
        scaleMethodTypeDescription: '',
      },
      {
        slot: 'TERTIARY',
        priorityCode: '3',
        priorityDescription: 'Tertiary',
        scaleMethodTypeCode: 'P',
        scaleMethodTypeDescription: 'Piece Scale',
      },
    ]);
  });

  it('falls back to the raw site type code when a LOV description is unavailable', () => {
    const siteTypes: ScaleSiteSummarySiteType[] = [{ priorityCode: 'P', scaleMethodTypeCode: 'X' }];

    expect(buildScaleSiteSiteTypeDisplayRows(siteTypes, priorityLovs, scaleMethodTypeLovs)[0])
      .toMatchObject({
        priorityDescription: 'Primary',
        scaleMethodTypeCode: 'X',
        scaleMethodTypeDescription: 'X',
      });
  });
});

