import { describe, expect, it } from 'vitest';

import type { StaticLov } from '@/services/lov.service';

import {
  classifyRiskLevel,
  getRiskLevelPillClass,
  mapStaticLovOptions,
  riskLevelPillClass,
  riskLevelRank,
  trimToUndefined,
} from './queryUtils';

describe('trimToUndefined', () => {
  it('trims a populated value', () => {
    expect(trimToUndefined('  A1  ')).toBe('A1');
  });

  it('collapses blank input to undefined, so it is omitted from a query', () => {
    expect(trimToUndefined('')).toBeUndefined();
    expect(trimToUndefined('   ')).toBeUndefined();
  });
});

describe('mapStaticLovOptions', () => {
  it('maps code/description pairs to value/label', () => {
    const lov = [{ code: 'H', description: 'High' }] as StaticLov[];

    expect(mapStaticLovOptions(lov)).toEqual([{ value: 'H', label: 'High' }]);
  });

  it('drops entries missing either half, which would render as blank options', () => {
    const lov = [
      { code: 'H', description: 'High' },
      { code: 'M' },
      { description: 'Orphan' },
      {},
    ] as StaticLov[];

    expect(mapStaticLovOptions(lov)).toEqual([{ value: 'H', label: 'High' }]);
  });

  it('returns an empty list for an empty LOV', () => {
    expect(mapStaticLovOptions([])).toEqual([]);
  });
});

describe('classifyRiskLevel', () => {
  it('classifies by the H/M/L ladder, case-insensitively', () => {
    expect(classifyRiskLevel('H')).toBe('high');
    expect(classifyRiskLevel('m')).toBe('medium');
    expect(classifyRiskLevel('Low')).toBe('low');
  });

  it('matches descriptions as well as codes', () => {
    expect(classifyRiskLevel('High Risk')).toBe('high');
  });

  it('returns undefined for a value matching no tier', () => {
    expect(classifyRiskLevel('')).toBeUndefined();
    expect(classifyRiskLevel(null)).toBeUndefined();
    expect(classifyRiskLevel(undefined)).toBeUndefined();
    expect(classifyRiskLevel('XYZ')).toBeUndefined();
  });

  it('resolves H before M before L when a value contains several', () => {
    // "HM" is ambiguous; the documented ladder checks high first, so the tier is stable.
    expect(classifyRiskLevel('HM')).toBe('high');
    expect(classifyRiskLevel('ML')).toBe('medium');
  });
});

describe('riskLevelPillClass', () => {
  it('builds a modifier class per tier', () => {
    expect(riskLevelPillClass('high')).toBe('risk-level-pill risk-level-pill--high');
    expect(riskLevelPillClass('low')).toBe('risk-level-pill risk-level-pill--low');
  });

  it('renders no pill for an unclassified level', () => {
    expect(riskLevelPillClass(undefined)).toBeUndefined();
  });
});

describe('riskLevelRank', () => {
  it('orders low below medium below high', () => {
    expect(riskLevelRank('low')).toBeLessThan(riskLevelRank('medium') as number);
    expect(riskLevelRank('medium')).toBeLessThan(riskLevelRank('high') as number);
  });

  it('returns null for an unclassified level so it sorts apart from ranked rows', () => {
    expect(riskLevelRank(undefined)).toBeNull();
  });
});

describe('colour and rank derive from one ladder', () => {
  it('never disagrees: a value with a pill always has a rank, and vice versa', () => {
    for (const value of ['H', 'M', 'L', 'High', 'medium', 'low', 'XYZ', '', null, undefined]) {
      const tier = classifyRiskLevel(value);
      const hasPill = getRiskLevelPillClass(value) !== undefined;
      const hasRank = riskLevelRank(tier) !== null;

      expect(hasPill).toBe(hasRank);
    }
  });

  it('getRiskLevelPillClass classifies raw values on the way through', () => {
    expect(getRiskLevelPillClass('High')).toBe('risk-level-pill risk-level-pill--high');
    expect(getRiskLevelPillClass('nope')).toBeUndefined();
  });
});
