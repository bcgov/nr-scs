import { Select, SelectItem, Grid, Column } from '@carbon/react';
import { type FC } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  title?: string;
  options: Option[];
  secondaryOptions?: Option[];
  primarySort: string;
  onPrimarySortChange: (value: string) => void;
  secondarySort: string;
  onSecondarySortChange: (value: string) => void;
  includeEmptySecondary?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'boxed' | 'form';
  showHeading?: boolean;
  disabled?: boolean;
}

const SortOptions: FC<Props> = ({
  title = 'Choose your sort order.',
  options,
  secondaryOptions,
  primarySort,
  onPrimarySortChange,
  secondarySort,
  onSecondarySortChange,
  includeEmptySecondary = true,
  layout = 'boxed',
  showHeading = true,
  disabled = false,
}) => {
  const resolvedSecondaryOptions = secondaryOptions ?? options;

  if (layout === 'form') {
    return (
      <section className="report-section sort">
        {showHeading ? <h4 style={{ marginBottom: '32px' }}>{title}</h4> : null}
              <Grid className="scs__form__grid" style={{ rowGap: '32px' }}>
          <Column lg={8} md={8} sm={4}>
            <Select
              id="primary-sort"
              value={primarySort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPrimarySortChange(e.target.value)}
              disabled={disabled}
              labelText="Primary Sort"
            >
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
              ))}
            </Select>
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Select
              id="secondary-sort"
              value={secondarySort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSecondarySortChange(e.target.value)}
              disabled={disabled}
              labelText="Secondary Sort"
            >
              {includeEmptySecondary && <SelectItem value="" text="None" />}
              {resolvedSecondaryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
              ))}
            </Select>
          </Column>
        </Grid>
        <div style={{ borderTop: '1px solid var(--cds-border-subtle)', marginTop: '32px', marginBottom: '40px' }} />
      </section>
    );
  }

  return (
    <section className="report-section sort">
      <h4 style={{ marginBottom: '32px' }}>{title}</h4>
      <div className="params-table sort-table">
        <div className="sort-columns">
          <div className="sort-col">
            <label className="param-label" htmlFor="primary-sort">Primary Sort</label>
            <Select
              id="primary-sort"
              value={primarySort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPrimarySortChange(e.target.value)}
              disabled={disabled}
              labelText=""
              hideLabel
            >
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
              ))}
            </Select>
          </div>

          <div className="sort-col">
            <label className="param-label" htmlFor="secondary-sort">Secondary Sort</label>
            <Select
              id="secondary-sort"
              value={secondarySort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSecondarySortChange(e.target.value)}
              disabled={disabled}
              labelText=""
              hideLabel
            >
              {includeEmptySecondary && <SelectItem value="" text="" />}
              {resolvedSecondaryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
              ))}
            </Select>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--cds-border-subtle)', marginTop: '32px', marginBottom: '40px' }} />
    </section>
  );
};

export default SortOptions;
