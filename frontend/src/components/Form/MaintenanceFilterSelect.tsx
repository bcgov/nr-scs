import { Column, Grid, Select, SelectItem } from '@carbon/react';

type Option = { value: string; text: string };

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Options below the "All" entry, already flattened to value/text by the caller. */
  options: Option[];
  /**
   * Value carried by the "All" entry. Most maintenance screens send the literal `ALL`; Templates
   * sends an empty string, which its search treats as "no filter".
   */
  allValue?: string;
  labelText?: string;
};

/**
 * The single-select filter above a maintenance list. Every maintenance screen renders the same
 * grid/row wrapper around one Select whose first entry is "All", so the markup lives here and the
 * callers supply only their options.
 */
const MaintenanceFilterSelect = ({
  id,
  value,
  onChange,
  options,
  allValue = 'ALL',
  labelText = 'Filter',
}: Props) => (
  <div className="scs__filter-grid">
    <Grid>
      <Column lg={8} md={8} sm={4}>
        <div className="scs__filter-row">
          <Select
            id={id}
            labelText={labelText}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <SelectItem value={allValue} text="All" />
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} text={option.text} />
            ))}
          </Select>
        </div>
      </Column>
    </Grid>
  </div>
);

export default MaintenanceFilterSelect;
