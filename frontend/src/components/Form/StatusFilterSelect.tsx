import { Select, SelectItem } from '@carbon/react';

import { STATUS_FILTER_OPTIONS, type StatusFilterValue } from '@/hooks/useStatusFilter';

interface StatusFilterSelectProps {
  id: string;
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

/** The client-side status filter control shared by the authorization list tabs. */
export function StatusFilterSelect({ id, value, onChange }: StatusFilterSelectProps) {
  return (
    <div style={{ maxWidth: '16rem', marginBottom: '1rem' }}>
      <Select
        id={id}
        labelText="Status"
        size="sm"
        value={value}
        onChange={(event) => onChange(event.target.value as StatusFilterValue)}
      >
        {STATUS_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} text={option} />
        ))}
      </Select>
    </div>
  );
}
