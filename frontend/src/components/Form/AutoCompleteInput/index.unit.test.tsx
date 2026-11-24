import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { renderWithProviders } from '@/config/tests/renderWithProviders';

import AutoCompleteInput from './index';

type Item = { id: number; name: string };

const onAutoCompleteChange = vi.fn();
const onSelect = vi.fn();

beforeEach(() => {
  onAutoCompleteChange.mockReset().mockResolvedValue([]);
  onSelect.mockReset();
});

const setup = (overrides: Record<string, unknown> = {}) =>
  renderWithProviders(
    <AutoCompleteInput<Item>
      id="autocomplete"
      titleText="Client"
      placeholder="Search clients"
      debounceTime={0}
      onAutoCompleteChange={onAutoCompleteChange}
      onSelect={onSelect}
      itemToString={(item: Item | null) => item?.name ?? ''}
      {...overrides}
    />,
  );

describe('AutoCompleteInput', () => {
  it('renders its input', () => {
    setup();

    expect(screen.getByPlaceholderText('Search clients')).toBeInTheDocument();
  });

  it('does not query before anything is typed', () => {
    setup();

    expect(onAutoCompleteChange).not.toHaveBeenCalled();
  });

  it('queries once the user types', async () => {
    setup();

    fireEvent.change(screen.getByPlaceholderText('Search clients'), {
      target: { value: 'Acme' },
    });

    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalledWith('Acme'));
  });

  it('passes the raw result through the supplied extractor', async () => {
    const extractItems = vi.fn(() => [{ id: 1, name: 'Acme Forestry' }]);
    onAutoCompleteChange.mockResolvedValue({ results: [{ id: 1, name: 'Acme Forestry' }] });
    setup({ extractItems });

    fireEvent.change(screen.getByPlaceholderText('Search clients'), {
      target: { value: 'Acme' },
    });

    await waitFor(() => expect(extractItems).toHaveBeenCalled());
  });

  it('treats the raw result as the item list when no extractor is given', async () => {
    onAutoCompleteChange.mockResolvedValue([{ id: 1, name: 'Acme Forestry' }]);
    setup();

    fireEvent.change(screen.getByPlaceholderText('Search clients'), {
      target: { value: 'Acme' },
    });

    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
  });

  it('survives a failed lookup', async () => {
    onAutoCompleteChange.mockRejectedValue(new Error('Lookup unavailable.'));
    setup();

    fireEvent.change(screen.getByPlaceholderText('Search clients'), {
      target: { value: 'Acme' },
    });

    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
    expect(JSON.stringify(onAutoCompleteChange.mock.calls.at(-1))).toContain('Acme');
    expect(screen.getByPlaceholderText('Search clients')).toHaveValue('Acme');
  });

  it('selects nothing on its own', async () => {
    onAutoCompleteChange.mockResolvedValue([{ id: 1, name: 'Acme Forestry' }]);
    setup();

    fireEvent.change(screen.getByPlaceholderText('Search clients'), {
      target: { value: 'Acme' },
    });

    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
    expect(onSelect).not.toHaveBeenCalled();
  });
});
