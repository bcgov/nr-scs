import { useEffect, useState } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { SpeciesProductGradeXref, StaticLov } from '@/services/lov.service';

/**
 * Loads the five lookup sets the summary check scale screens need — check scale types, species,
 * products, grades and the species/product/grade cross-reference — in a single round of parallel
 * requests. The create and update screens both need exactly this set, so it lives here rather than
 * being repeated in each.
 *
 * A failed load resets every list to empty rather than leaving a partially populated form: the
 * dependent Species/Product/Grade selects are only meaningful together.
 */
export const useSummaryCheckScaleLovs = () => {
  const { userToken } = useAuth();
  const [checkScaleTypeOptions, setCheckScaleTypeOptions] = useState<StaticLov[]>([]);
  const [speciesLov, setSpeciesLov] = useState<StaticLov[]>([]);
  const [productLov, setProductLov] = useState<StaticLov[]>([]);
  const [gradeLov, setGradeLov] = useState<StaticLov[]>([]);
  const [spgXref, setSpgXref] = useState<SpeciesProductGradeXref[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await userToken();
        const [typeLov, species, product, grade, xref] = await Promise.all([
          API.lov.getStaticLov({ tableKey: 'CHECK_SCALE_TYPE_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_SPECIES_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_PRODUCT_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_GRADE_CODE' }, token),
          API.lov.getSpeciesProductGradeXref(token),
        ]);
        if (!cancelled) {
          setCheckScaleTypeOptions(typeLov ?? []);
          setSpeciesLov(species ?? []);
          setProductLov(product ?? []);
          setGradeLov(grade ?? []);
          setSpgXref(xref ?? []);
        }
      } catch {
        if (!cancelled) {
          setCheckScaleTypeOptions([]);
          setSpeciesLov([]);
          setProductLov([]);
          setGradeLov([]);
          setSpgXref([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userToken]);

  return { checkScaleTypeOptions, speciesLov, productLov, gradeLov, spgXref };
};
