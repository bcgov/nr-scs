import { Select, SelectItem } from '@carbon/react';
import { type FC, type ReactNode, useCallback, useMemo } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import type { RegionDistrictLov } from '@/services/lov.service';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  hideLabel?: boolean;
  labelText?: ReactNode;
  invalid?: boolean;
  invalidText?: string;
  disabled?: boolean;
  useApi?: boolean;
}

type DistrictOption = {
  value: string;
  text: string;
};

const DistrictSelect: FC<Props> = ({
  id = 'district',
  value,
  onChange,
  hideLabel = true,
  labelText = '',
  invalid,
  invalidText,
  disabled = false,
  useApi = true,
}) => {
  const { userToken } = useAuth();

  const loadDistricts = useCallback(async () => {
    const token = await userToken();
    return API.lov.getRegionDistrictLov(undefined, token);
  }, [userToken]);

  const { data: apiRegionsDistricts, isLoading: isLoadingApi } = useLovOptions<RegionDistrictLov>(
    loadDistricts,
    {
      enabled: useApi,
      errorMessage: 'Could not load districts.',
      cacheKey: 'region-district-lov:no-rollup',
    },
  );

  const apiDistricts = useMemo<DistrictOption[]>(() => {
    if (!useApi || apiRegionsDistricts.length === 0) {
      return [];
    }

    return apiRegionsDistricts
      .filter((opt) => opt.code)
      .map((opt) => {
        const code = String(opt.code ?? '').trim();
        const description = String(opt.description ?? '').trim();
        const upperCode = code.toUpperCase();
        return {
          value: upperCode,
          text: description,
        };
      });
  }, [apiRegionsDistricts, useApi]);

  return (
    <Select
      id={id}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      labelText={labelText}
      hideLabel={hideLabel}
      invalid={invalid}
      invalidText={invalidText}
      disabled={disabled || (useApi && isLoadingApi)}
    >
      <SelectItem value="" text="" />
      {apiDistricts.map((opt) => (
        <SelectItem
          key={opt.value}
          value={opt.value}
          text={opt.text}
        />
      ))}
    </Select>
  );
};

export default DistrictSelect;
