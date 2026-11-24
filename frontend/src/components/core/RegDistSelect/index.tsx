import { Select, SelectItem } from '@carbon/react';
import { type FC, type ReactNode, useCallback, useEffect, useMemo } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import type { RegionDistrictRollupLov } from '@/services/lov.service';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  hideLabel?: boolean;
  labelText?: ReactNode;
  emptyText?: string;
  invalid?: boolean;
  invalidText?: string;
  disabled?: boolean;
  useApi?: boolean;
  persistSelection?: boolean;
  persistKey?: string;
  districtsOnly?: boolean;
  /**
   * Reports variant: group districts under their region, prefix each row with
   * its own org-unit code, and indent the districts. Defaults to false so the
   * non-report usages (Signature Blocks, Letters) keep the flat appearance.
   */
  grouped?: boolean;
}

// Districts are indented under their region in the grouped (reports) variant,
// mirroring the legacy dropdown which prepended four non-breaking spaces
// (regular spaces are collapsed by the browser in a native <option>).
const DISTRICT_INDENT = '    ';

type RegDistOption = {
  value: string;
  text: string;
  kind: 'region' | 'district';
  orgUnitNo?: number | null;
  rollupRegionNo?: number | null;
  orgUnitCode?: string | null;
  description?: string | null;
};

// Removed unused indent function

const RegDistSelect: FC<Props> = ({
  id = 'reg-dist',
  value,
  onChange,
  hideLabel = true,
  labelText = '',
  emptyText = 'All',
  invalid,
  invalidText,
  disabled = false,
  useApi = true,
  persistSelection = false,
  persistKey,
  districtsOnly = false,
  grouped = false,
}) => {
  const { userToken } = useAuth();

  const loadRegionsDistricts = useCallback(async () => {
    const token = await userToken();
    return API.lov.getRegionDistrictRollupLov(undefined, token);
  }, [userToken]);

  const { data: apiRegionsDistricts, isLoading: isLoadingApi } = useLovOptions<RegionDistrictRollupLov>(
    loadRegionsDistricts,
    {
      enabled: useApi,
      errorMessage: 'Could not load regions/districts.',
      cacheKey: 'region-district-lov:rollup',
    },
  );

  const apiOptions = useMemo<RegDistOption[]>(() => {
    if (!useApi || apiRegionsDistricts.length === 0) {
      return [];
    }

    const regionCodeByOrgUnitNo = new Map<number, string>();
    apiRegionsDistricts.forEach((opt) => {
      if (opt.code == null || opt.code !== opt.rollupRegionNo || !opt.orgUnitCode) {
        return;
      }

      regionCodeByOrgUnitNo.set(opt.code, opt.orgUnitCode.trim());
    });

    const cleanDistrictName = (opt: RegionDistrictRollupLov) => {
      const description = String(opt.description ?? '').trim();
      const orgUnitCode = String(opt.orgUnitCode ?? '').trim();
      const codePrefix = opt.code == null ? '' : String(opt.code);

      const stripPrefix = (value: string, prefix: string) => {
        if (!prefix || !value) {
          return value;
        }

        const separators = [' - ', ' -', '- ', '-', ' : ', ': ', ':', ' – ', ' –', '– ', '–', ' — ', ' —', '— ', '—', ' '];
        const lowerValue = value.toLowerCase();
        const lowerPrefix = prefix.toLowerCase();

        for (const separator of separators) {
          const candidate = `${lowerPrefix}${separator}`;
          if (lowerValue.startsWith(candidate)) {
            return value.slice(candidate.length).trim();
          }
        }

        return value;
      };

      const withoutOrgUnitCode = stripPrefix(description, orgUnitCode);
      if (withoutOrgUnitCode !== description && withoutOrgUnitCode) {
        return withoutOrgUnitCode;
      }

      const withoutCodePrefix = stripPrefix(description, codePrefix);
      if (withoutCodePrefix !== description && withoutCodePrefix) {
        return withoutCodePrefix;
      }

      return description;
    };

    const buildOptionText = (opt: RegionDistrictRollupLov) => {
      const description = cleanDistrictName(opt);
      const orgUnitCode = String(opt.orgUnitCode ?? '').trim();
      const regionCode = opt.rollupRegionNo == null
        ? ''
        : (regionCodeByOrgUnitNo.get(opt.rollupRegionNo) ?? '').trim();

      const isRegion = opt.code != null && opt.code === opt.rollupRegionNo;
      const withCode = (code: string) =>
        code && description ? `${code} - ${description}` : code || description;

      if (isRegion) {
        return withCode(orgUnitCode);
      }

      // Reports (grouped): prefix a district with its own org-unit code, matching
      // the legacy report dropdown. Elsewhere keep the flat behaviour of showing
      // the parent region code.
      if (grouped) {
        return withCode(orgUnitCode);
      }

      if (regionCode && description) {
        return `${regionCode} - ${description}`;
      }

      return description || regionCode || orgUnitCode;
    };

    let options = apiRegionsDistricts
      .filter((opt): opt is RegionDistrictRollupLov & { orgUnitCode: string } => Boolean(opt.orgUnitCode))
      .map((opt) => {
        const orgUnitNo = opt.code;
        const rollupRegionNo = opt.rollupRegionNo;
        const text = buildOptionText(opt);
        const kind: 'region' | 'district' = orgUnitNo === rollupRegionNo
          ? 'region'
          : 'district';
        const value = opt.orgUnitCode;

        return {
          value,
          text,
          kind,
          orgUnitNo,
          rollupRegionNo,
          orgUnitCode: opt.orgUnitCode,
          description: opt.description,
        };
      });
    // If districtsOnly is set, filter to only districts
    if (districtsOnly) {
      options = options.filter((opt) => opt.kind === 'district');
    }

    // Reports (grouped): order each region immediately above the districts that
    // roll up to it, and indent those districts.
    if (grouped) {
      const districtsByRegion = new Map<number, RegDistOption[]>();
      options
        .filter((opt) => opt.kind === 'district')
        .forEach((district) => {
          const key = district.rollupRegionNo ?? -1;
          const bucket = districtsByRegion.get(key);
          if (bucket) {
            bucket.push(district);
          } else {
            districtsByRegion.set(key, [district]);
          }
        });

      const indentDistrict = (district: RegDistOption): RegDistOption => ({
        ...district,
        text: `${DISTRICT_INDENT}${district.text}`,
      });

      const ordered: RegDistOption[] = [];
      options
        .filter((opt) => opt.kind === 'region')
        .sort((a, b) => (a.orgUnitNo ?? 0) - (b.orgUnitNo ?? 0))
        .forEach((region) => {
          ordered.push(region);
          const districts = districtsByRegion.get(region.orgUnitNo ?? -1) ?? [];
          districts
            .sort((a, b) => a.text.localeCompare(b.text))
            .forEach((district) => ordered.push(indentDistrict(district)));
          districtsByRegion.delete(region.orgUnitNo ?? -1);
        });

      // Any districts whose parent region is missing still get shown (indented).
      districtsByRegion.forEach((districts) => {
        districts.forEach((district) => ordered.push(indentDistrict(district)));
      });

      return ordered;
    }

    return options;
  }, [apiRegionsDistricts, useApi, districtsOnly, grouped]);

  const storageKey = persistKey ?? `reg-dist:${id}`;

  useEffect(() => {
    if (!persistSelection || value) {
      return;
    }
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        onChange(cached);
      }
    } catch {
      // ignore storage errors
    }
  }, [onChange, persistSelection, storageKey, value]);

  const handleChange = useCallback((nextValue: string) => {
    if (persistSelection) {
      try {
        sessionStorage.setItem(storageKey, nextValue);
      } catch {
        // ignore storage errors
      }
    }
    onChange(nextValue);
  }, [onChange, persistSelection, storageKey]);

  return (
    <Select
      id={id}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange(e.target.value)}
      disabled={disabled || (useApi && isLoadingApi)}
      labelText={labelText}
      hideLabel={hideLabel}
      invalid={invalid}
      invalidText={invalidText}
    >
      <SelectItem value="" text={emptyText} />
      {apiOptions.map((opt) => (
        <SelectItem
          key={opt.value}
          value={opt.value}
          text={opt.text}
        />
      ))}
    </Select>
  );
};

export default RegDistSelect;

