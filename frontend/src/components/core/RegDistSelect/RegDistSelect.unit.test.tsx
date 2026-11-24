import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import RegDistSelect from './index';
import type { RegionDistrictRollupLov } from '@/services/lov.service';

// Four non-breaking spaces — the indent the grouped (reports) variant prepends
// to each district, mirroring the legacy report dropdown.
const INDENT = '    ';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: vi.fn().mockResolvedValue('token') }),
}));

// Feed the component a fixed LOV payload instead of hitting the API.
const lov = vi.hoisted(() => ({ data: [] as RegionDistrictRollupLov[] }));
vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: () => ({ data: lov.data, isLoading: false, error: null }),
}));

// Two regions, three districts. Descriptions carry the code prefix as they do
// in the real data, so we also exercise the prefix-stripping/rebuild logic.
const SAMPLE: RegionDistrictRollupLov[] = [
  { code: 201, description: 'DPG - Prince George', rollupRegionNo: 100, orgUnitCode: 'DPG' },
  { code: 100, description: 'RNI - Northern Interior', rollupRegionNo: 100, orgUnitCode: 'RNI' },
  { code: 301, description: 'DKA - Kamloops', rollupRegionNo: 300, orgUnitCode: 'DKA' },
  { code: 202, description: 'DND - Nadina', rollupRegionNo: 100, orgUnitCode: 'DND' },
  { code: 300, description: 'RSI - Southern Interior', rollupRegionNo: 300, orgUnitCode: 'RSI' },
];

const renderSelect = (props: Partial<Parameters<typeof RegDistSelect>[0]> = {}) => {
  lov.data = SAMPLE;
  const { container } = render(
    <RegDistSelect value="" onChange={vi.fn()} labelText="Reg / Dist" {...props} />,
  );
  const options = Array.from(container.querySelectorAll('option'));
  return options;
};

describe('RegDistSelect', () => {
  describe('grouped (reports) variant', () => {
    it('groups districts under their region, indents them, and shows the district-specific code', () => {
      const options = renderSelect({ grouped: true });

      // Each region is immediately followed by its own indented districts,
      // regions ordered by org-unit number and districts alphabetically.
      expect(options.map((o) => o.textContent)).toEqual([
        'All',
        'RNI - Northern Interior',
        `${INDENT}DND - Nadina`,
        `${INDENT}DPG - Prince George`,
        'RSI - Southern Interior',
        `${INDENT}DKA - Kamloops`,
      ]);
    });

    it('uses the district org-unit code as the option value', () => {
      const options = renderSelect({ grouped: true });
      const princeGeorge = options.find((o) => o.textContent?.includes('Prince George'));
      expect(princeGeorge?.getAttribute('value')).toBe('DPG');
    });
  });

  describe('default (non-report) variant', () => {
    it('renders a flat list with no indentation and prefixes districts with the parent region code', () => {
      const options = renderSelect();

      const texts = options.map((o) => o.textContent);
      // No district is indented in the flat variant.
      expect(texts.some((t) => t?.startsWith(INDENT))).toBe(false);
      // District keeps the legacy flat behaviour: parent region code prefix.
      expect(texts).toContain('RNI - Prince George');
      // Order is unchanged from the source data (not grouped/re-sorted).
      expect(texts).toEqual([
        'All',
        'RNI - Prince George',
        'RNI - Northern Interior',
        'RSI - Kamloops',
        'RNI - Nadina',
        'RSI - Southern Interior',
      ]);
    });
  });
});
