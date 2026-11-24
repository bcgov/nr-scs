import { useCallback, useState } from 'react';

import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';

/** A scale site attached to a scaler authorization. */
export interface SelectedScaleSite {
  scaleSiteIdNmbr: string;
  siteName?: string | null;
}

/**
 * The scale-site list on the scaler authorization screens: the typed-in add (which looks the
 * number up before accepting it), the pick from the search modal, and the remove. Both the create
 * and edit pages carried an identical copy of this.
 *
 * The list state is owned here, but its setters are returned as well: the edit page seeds the list
 * from the record it loads and the create page clears it on reset.
 */
export const useSelectedScaleSites = (userToken: () => Promise<string | undefined>) => {
  const [scaleSites, setScaleSites] = useState<SelectedScaleSite[]>([]);
  const [scaleSiteInput, setScaleSiteInput] = useState('');
  const [scaleSitesError, setScaleSitesError] = useState<string | null>(null);
  const [scaleSiteModalOpen, setScaleSiteModalOpen] = useState(false);

  /** Adds the site typed into the input, after confirming it exists. */
  const onAddScaleSite = useCallback(async () => {
    const scaleSiteIdNmbr = scaleSiteInput.trim().toUpperCase();
    if (!scaleSiteIdNmbr) {
      return;
    }

    try {
      setScaleSitesError(null);
      const token = await userToken();
      const results = await API.scaleSites.searchScaleSites({ scaleSiteIdNmbr }, token);
      const match = results?.[0];
      if (!match?.scaleSiteIdNmbr) {
        setScaleSitesError(`Scale site ${scaleSiteIdNmbr} was not found.`);
        return;
      }
      setScaleSites((prev) => {
        if (prev.some((item) => item.scaleSiteIdNmbr === match.scaleSiteIdNmbr)) {
          return prev;
        }
        return [...prev, { scaleSiteIdNmbr: match.scaleSiteIdNmbr ?? scaleSiteIdNmbr, siteName: match.siteName }];
      });
      setScaleSiteInput('');
    } catch (error) {
      setScaleSitesError(extractApiError(error, 'Could not add scale site.'));
    }
  }, [scaleSiteInput, userToken]);

  /** Adds a site chosen from the search modal, which has already been resolved. */
  const handleScaleSiteSelect = useCallback(
    (site: { scaleSiteIdNmbr?: string | null; siteName?: string | null }) => {
      if (!site?.scaleSiteIdNmbr) {
        return;
      }
      setScaleSites((prev) => {
        if (prev.some((item) => item.scaleSiteIdNmbr === site.scaleSiteIdNmbr)) {
          return prev;
        }
        return [...prev, { scaleSiteIdNmbr: site.scaleSiteIdNmbr ?? '', siteName: site.siteName }];
      });
      setScaleSiteModalOpen(false);
    },
    [],
  );

  const onRemoveScaleSite = useCallback((scaleSiteIdNmbr: string) => {
    setScaleSites((prev) => prev.filter((item) => item.scaleSiteIdNmbr !== scaleSiteIdNmbr));
  }, []);

  return {
    scaleSites,
    setScaleSites,
    scaleSiteInput,
    setScaleSiteInput,
    scaleSitesError,
    setScaleSitesError,
    scaleSiteModalOpen,
    setScaleSiteModalOpen,
    onAddScaleSite,
    handleScaleSiteSelect,
    onRemoveScaleSite,
  };
};
