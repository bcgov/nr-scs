import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ClientLocSearch from './index';

/**
 * Every client/loc parameter in the OpenAPI contract is `maxLength: 8` / `maxLength: 2` — a forest
 * client number is 8 chars and a location code 2. The generated API interfaces turn those into
 * `@Size` constraints, so an over-length value is a 400 rather than an empty result set. These
 * defaults are what stop the user from typing one.
 */
describe('ClientLocSearch', () => {
  const renderComponent = (props?: Partial<React.ComponentProps<typeof ClientLocSearch>>) =>
    render(
      <ClientLocSearch
        labelText="Site Owner (Client / Loc)"
        client=""
        loc=""
        onClientChange={vi.fn()}
        onLocChange={vi.fn()}
        showSearchButton={false}
        clientId="clientNumber"
        locId="clientLocnCode"
        {...props}
      />,
    );

  it('caps the client at 8 and the loc at 2 by default', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('Client')).toHaveAttribute('maxlength', '8');
    expect(screen.getByPlaceholderText('Loc')).toHaveAttribute('maxlength', '2');
  });

  it('lets a caller override the caps', () => {
    renderComponent({ clientMaxLength: 12, locMaxLength: 4 });

    expect(screen.getByPlaceholderText('Client')).toHaveAttribute('maxlength', '12');
    expect(screen.getByPlaceholderText('Loc')).toHaveAttribute('maxlength', '4');
  });

  /**
   * Search filters carry `%` wildcards through to the backend, which zero-pads a plain number for an
   * exact match but passes a `%` value raw to the package's LIKE (legacy `clientSearch.do` used
   * free-text inputs with no validation rules). So these inputs must stay unfiltered — a digits-only
   * sanitizer here would silently break wildcard search on every page that uses this component.
   */
  it('passes a % wildcard through unchanged in both inputs', async () => {
    const onClientChange = vi.fn();
    const onLocChange = vi.fn();
    renderComponent({ onClientChange, onLocChange });

    await userEvent.type(screen.getByPlaceholderText('Client'), '%');
    await userEvent.type(screen.getByPlaceholderText('Loc'), '%');

    expect(onClientChange).toHaveBeenCalledWith('%');
    expect(onLocChange).toHaveBeenCalledWith('%');
  });

  /**
   * A pasted client number often carries surrounding whitespace, and the contract's `pattern` on
   * `clientNumber`/`clientLocnCode` rejects it — so passing it through produced a 400 instead of a
   * result set. Whitespace is never part of a client number or location code, so strip it here
   * (the backend trims too, but interior whitespace only a paste can produce is caught here).
   */
  it('strips whitespace from a pasted client number', async () => {
    const onClientChange = vi.fn();
    renderComponent({ onClientChange });

    const input = screen.getByPlaceholderText('Client');
    await userEvent.click(input);
    await userEvent.paste('  21  ');

    expect(onClientChange).toHaveBeenLastCalledWith('21');
  });

  it('strips whitespace from a pasted loc', async () => {
    const onLocChange = vi.fn();
    renderComponent({ onLocChange });

    const input = screen.getByPlaceholderText('Loc');
    await userEvent.click(input);
    await userEvent.paste(' 0');

    expect(onLocChange).toHaveBeenLastCalledWith('0');
  });

  it('strips interior whitespace a paste can introduce', async () => {
    const onClientChange = vi.fn();
    renderComponent({ onClientChange });

    const input = screen.getByPlaceholderText('Client');
    await userEvent.click(input);
    await userEvent.paste('12 34');

    expect(onClientChange).toHaveBeenLastCalledWith('1234');
  });
});
