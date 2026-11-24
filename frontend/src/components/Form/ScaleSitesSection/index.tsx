import { Add, Search } from '@carbon/icons-react';
import { Column, Grid, InlineNotification, TextInput } from '@carbon/react';
import type { FC, ReactNode } from 'react';

import TableRemoveButton from '@/components/Form/TableRemoveButton';
import Button from '@/components/core/Button';
import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';

import './index.scss';

export type SelectedScaleSite = {
  scaleSiteIdNmbr: string;
  siteName?: string | null;
};

type ScaleSitesSectionProps = {
  districtWideInd: '' | 'Y' | 'N';
  scaleSiteInput: string;
  onScaleSiteInputChange: (value: string) => void;
  scaleSites: SelectedScaleSite[];
  onAddScaleSite: () => void;
  onOpenSearch: () => void;
  onRemoveScaleSite: (scaleSiteIdNmbr: string) => void;
  isAddingScaleSite?: boolean;
  addDisabled?: boolean;
  searchDisabled?: boolean;
  labelText: ReactNode;
  invalid?: boolean;
  invalidText?: string;
  sectionError?: string | null;
  sectionErrorTitle?: string;
};

const ScaleSitesSection: FC<ScaleSitesSectionProps> = ({
  districtWideInd,
  scaleSiteInput,
  onScaleSiteInputChange,
  scaleSites,
  onAddScaleSite,
  onOpenSearch,
  onRemoveScaleSite,
  isAddingScaleSite = false,
  addDisabled = false,
  searchDisabled = false,
  labelText,
  invalid = false,
  invalidText,
  sectionError,
  sectionErrorTitle = 'Scale Sites',
}) => {
  if (districtWideInd !== 'N') {
    return null;
  }

  const scaleSiteTableContent: PageableResponse<SelectedScaleSite> = {
    content: scaleSites.map((site) => ({ ...site, id: site.scaleSiteIdNmbr })),
    page: {
      size: Math.max(1, scaleSites.length),
      number: 0,
      totalElements: scaleSites.length,
      totalPages: 1,
    },
  };

  return (
    <>
      <div className="scs__form__divider" />
      <h4 className="scs__form__section-title">Scale Sites</h4>
      {sectionError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title={sectionErrorTitle}
          subtitle={sectionError}
          style={{ marginBottom: '16px' }}
        />
      ) : null}
      <Grid className="scs__form__grid scale-sites-section__grid">
        <Column lg={8} md={8} sm={4}>
          <div className="scale-sites-section__input-row">
            <TextInput
              id="scale-site-number"
              value={scaleSiteInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onScaleSiteInputChange(e.target.value)}
              labelText={labelText}
              maxLength={10}
              invalid={invalid}
              invalidText={invalidText}
            />
            <div className="scale-sites-section__button-group">
              <Button kind="secondary" className="scs__input-search-button" onClick={onAddScaleSite} disabled={addDisabled} renderIcon={Add}>
                {isAddingScaleSite ? 'Adding...' : 'Add'}
              </Button>
              <Button kind="secondary" className="scs__input-search-button" onClick={onOpenSearch} disabled={searchDisabled} renderIcon={Search}>
                Search
              </Button>
            </div>
          </div>
        </Column>
      </Grid>
      {scaleSites.length > 0 ? (
        <TableResource
          headers={[
            { key: 'scaleSiteIdNmbr', header: 'Site #', selected: true },
            { key: 'siteName', header: 'Site Name', selected: true },
            {
              key: 'remove',
              header: '\u00A0',
              selected: true,
              renderAs: (_value: unknown, row: SelectedScaleSite) => (
                <div style={{ textAlign: 'right' }}>
                  <TableRemoveButton onClick={() => onRemoveScaleSite(row.scaleSiteIdNmbr)} />
                </div>
              ),
            },
          ] as TableHeaderType<SelectedScaleSite>[]}
          content={scaleSiteTableContent}
          loading={false}
          error={false}
        />
      ) : null}
    </>
  );
};

export default ScaleSitesSection;