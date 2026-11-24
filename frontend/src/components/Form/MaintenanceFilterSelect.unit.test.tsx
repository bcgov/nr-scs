import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceFilterSelect from './MaintenanceFilterSelect';

const options = [
  { value: 'A', text: 'Alpha' },
  { value: 'B', text: 'Beta' },
];

describe('MaintenanceFilterSelect', () => {
  it('renders an "All" entry ahead of the supplied options', () => {
    render(
      <MaintenanceFilterSelect id="f" value="ALL" onChange={vi.fn()} options={options} />,
    );

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All',
      'Alpha',
      'Beta',
    ]);
  });

  it('defaults the "All" entry to ALL, which is what most screens send', () => {
    render(
      <MaintenanceFilterSelect id="f" value="ALL" onChange={vi.fn()} options={options} />,
    );

    expect(screen.getByRole('option', { name: 'All' })).toHaveValue('ALL');
  });

  it('honours an overridden allValue — Templates sends empty for "no filter"', () => {
    render(
      <MaintenanceFilterSelect id="f" value="" onChange={vi.fn()} options={options} allValue="" />,
    );

    expect(screen.getByRole('option', { name: 'All' })).toHaveValue('');
  });

  it('reports the chosen value, not the event', () => {
    const onChange = vi.fn();
    render(<MaintenanceFilterSelect id="f" value="ALL" onChange={onChange} options={options} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'B' } });

    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('uses the id it is given, so screens keep their existing element ids', () => {
    render(
      <MaintenanceFilterSelect
        id="condition-filter"
        value="ALL"
        onChange={vi.fn()}
        options={options}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'condition-filter');
  });

  it('labels the control "Filter" by default and accepts an override', () => {
    const { rerender } = render(
      <MaintenanceFilterSelect id="f" value="ALL" onChange={vi.fn()} options={[]} />,
    );
    expect(screen.getByLabelText('Filter')).toBeInTheDocument();

    rerender(
      <MaintenanceFilterSelect
        id="f"
        value="ALL"
        onChange={vi.fn()}
        options={[]}
        labelText="Status"
      />,
    );
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });
});
