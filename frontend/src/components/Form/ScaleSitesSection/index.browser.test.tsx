import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import './index.scss';

import ScaleSitesSection, { type SelectedScaleSite } from './index';

const Harness = () => {
  const [scaleSiteInput, setScaleSiteInput] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [scaleSites] = useState<SelectedScaleSite[]>([]);

  return (
    <ScaleSitesSection
      districtWideInd="N"
      scaleSiteInput={scaleSiteInput}
      onScaleSiteInputChange={(value) => {
        setScaleSiteInput(value);
        setFieldError(null);
      }}
      scaleSites={scaleSites}
      onAddScaleSite={() => {
        if (!scaleSiteInput.trim()) {
          setFieldError('Site # is required.');
        }
      }}
      onOpenSearch={vi.fn()}
      onRemoveScaleSite={vi.fn()}
      labelText="Site #"
      invalid={Boolean(fieldError)}
      invalidText={fieldError ?? undefined}
    />
  );
};

describe('ScaleSitesSection', () => {
  it('keeps the Add and Search buttons in place when validation text appears', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const addButton = screen.getByRole('button', { name: /^Add$/i });
    const searchButton = screen.getByRole('button', { name: /^Search$/i });

    const initialAddTop = Math.round(addButton.getBoundingClientRect().top);
    const initialSearchTop = Math.round(searchButton.getBoundingClientRect().top);

    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Site # is required.')).toBeInTheDocument();
    });

    expect(Math.round(addButton.getBoundingClientRect().top)).toBe(initialAddTop);
    expect(Math.round(searchButton.getBoundingClientRect().top)).toBe(initialSearchTop);
    expect(Math.round(addButton.getBoundingClientRect().top)).toBe(Math.round(searchButton.getBoundingClientRect().top));
  });

  const baseProps = {
    districtWideInd: 'N' as '' | 'Y' | 'N',
    scaleSiteInput: '',
    onScaleSiteInputChange: vi.fn(),
    scaleSites: [] as SelectedScaleSite[],
    onAddScaleSite: vi.fn(),
    onOpenSearch: vi.fn(),
    onRemoveScaleSite: vi.fn(),
    labelText: 'Site #',
  };

  afterEach(() => cleanup());

  it('renders nothing when District Wide is not No', () => {
    const { container } = render(<ScaleSitesSection {...baseProps} districtWideInd="Y" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists sites and wires the Add / Search / Remove callbacks', () => {
    const onAddScaleSite = vi.fn();
    const onOpenSearch = vi.fn();
    const onRemoveScaleSite = vi.fn();
    render(
      <ScaleSitesSection
        {...baseProps}
        onAddScaleSite={onAddScaleSite}
        onOpenSearch={onOpenSearch}
        onRemoveScaleSite={onRemoveScaleSite}
        scaleSites={[{ scaleSiteIdNmbr: '520', siteName: 'TEMBEC - CANAL FLATS' }]}
      />,
    );

    expect(screen.getByText('TEMBEC - CANAL FLATS')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Search$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(onAddScaleSite).toHaveBeenCalled();
    expect(onOpenSearch).toHaveBeenCalled();
    expect(onRemoveScaleSite).toHaveBeenCalledWith('520');
  });

  it('shows the section error notification and the Adding... label', () => {
    render(<ScaleSitesSection {...baseProps} sectionError="Could not add scale site." isAddingScaleSite />);
    expect(screen.getByText('Could not add scale site.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adding...' })).toBeInTheDocument();
  });
});