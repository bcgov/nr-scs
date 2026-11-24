import { describe, it, expect } from 'vitest';

import type { StaticLov } from '@/services/lov.service';
import {
  SCALER_AUTHORIZATION_JOB_FUNCTION_CODES,
  filterScalerAuthorizationJobFunctions,
} from './scalerAuthorizationJobFunctions';

const lov = (code: string, description: string): StaticLov => ({
  tableKey: 'SCALE_METHOD_TYPE_CODE',
  code,
  description,
});

const FULL_LOV: StaticLov[] = [
  lov('P', 'Piece Scale'),
  lov('W', 'Weight Scale'),
  lov('C', 'Cruise Based'),
  lov('S', 'Special Forest Product'),
];

describe('filterScalerAuthorizationJobFunctions', () => {
  it('excludes "Cruise Based" (code C), matching the legacy screen', () => {
    const result = filterScalerAuthorizationJobFunctions(FULL_LOV);

    expect(result.map((opt) => opt.code)).toEqual(['P', 'W', 'S']);
    expect(result.some((opt) => opt.code === 'C')).toBe(false);
    expect(result.some((opt) => opt.description === 'Cruise Based')).toBe(false);
  });

  it('keeps only the allowlisted Piece/Weigh/SFP codes', () => {
    expect(SCALER_AUTHORIZATION_JOB_FUNCTION_CODES).toEqual(['P', 'W', 'S']);
  });

  it('drops any other/unknown codes not offered by the legacy screen', () => {
    const result = filterScalerAuthorizationJobFunctions([...FULL_LOV, lov('X', 'Made Up')]);
    expect(result.map((opt) => opt.code)).toEqual(['P', 'W', 'S']);
  });

  it('is case- and whitespace-insensitive on the code', () => {
    const result = filterScalerAuthorizationJobFunctions([lov(' p ', 'Piece Scale'), lov('c', 'Cruise Based')]);
    expect(result.map((opt) => opt.description)).toEqual(['Piece Scale']);
  });

  it('returns an empty list when given no options', () => {
    expect(filterScalerAuthorizationJobFunctions([])).toEqual([]);
  });
});
