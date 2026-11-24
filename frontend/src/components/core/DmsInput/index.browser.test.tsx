import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DmsInput, { type DmsValue } from './index';

const value: DmsValue = { degrees: '49', minutes: '10', seconds: '99' };

const parts = () => ({
  degrees: screen.getByPlaceholderText('Deg') as HTMLInputElement,
  minutes: screen.getByPlaceholderText('Min') as HTMLInputElement,
  seconds: screen.getByPlaceholderText('Sec') as HTMLInputElement,
});

const isInvalid = (input: HTMLInputElement) => input.getAttribute('aria-invalid') === 'true';

describe('DmsInput per-sub-field invalid highlighting', () => {
  it('highlights only the sub-field flagged by invalidParts', () => {
    render(
      <DmsInput
        id="latitude"
        labelText="Latitude"
        value={value}
        onChange={() => {}}
        invalid
        invalidParts={{ seconds: true }}
        invalidText="Latitude seconds must be between 0 and 59."
      />,
    );

    const { degrees, minutes, seconds } = parts();
    expect(isInvalid(seconds)).toBe(true);
    expect(isInvalid(degrees)).toBe(false);
    expect(isInvalid(minutes)).toBe(false);
    // group-level message still shows
    expect(screen.getByText('Latitude seconds must be between 0 and 59.')).toBeTruthy();
  });

  it('falls back to reddening every sub-field when invalidParts is omitted', () => {
    render(
      <DmsInput
        id="longitude"
        labelText="Longitude"
        value={value}
        onChange={() => {}}
        invalid
        invalidText="Longitude and latitude must both be provided or both be omitted."
      />,
    );

    const { degrees, minutes, seconds } = parts();
    expect(isInvalid(degrees)).toBe(true);
    expect(isInvalid(minutes)).toBe(true);
    expect(isInvalid(seconds)).toBe(true);
  });

  it('renders a separate line for each message in invalidMessages', () => {
    render(
      <DmsInput
        id="latitude"
        labelText="Latitude"
        value={value}
        onChange={() => {}}
        invalid
        invalidParts={{ minutes: true, seconds: true }}
        invalidMessages={[
          'Latitude minutes must be between 0 and 59.',
          'Latitude seconds must be between 0 and 59.',
        ]}
        invalidText="Latitude minutes must be between 0 and 59."
      />,
    );

    expect(screen.getByText('Latitude minutes must be between 0 and 59.')).toBeTruthy();
    expect(screen.getByText('Latitude seconds must be between 0 and 59.')).toBeTruthy();
  });

  it('falls back to invalidText when invalidMessages is empty', () => {
    render(
      <DmsInput
        id="latitude"
        labelText="Latitude"
        value={value}
        onChange={() => {}}
        invalid
        invalidMessages={[]}
        invalidText="Latitude and longitude must both be provided or both be omitted."
      />,
    );

    expect(
      screen.getByText('Latitude and longitude must both be provided or both be omitted.'),
    ).toBeTruthy();
  });

  it('marks no sub-field invalid when neither invalid nor invalidParts is set', () => {
    render(
      <DmsInput id="lat2" labelText="Latitude" value={value} onChange={() => {}} />,
    );

    const { degrees, minutes, seconds } = parts();
    expect(isInvalid(degrees)).toBe(false);
    expect(isInvalid(minutes)).toBe(false);
    expect(isInvalid(seconds)).toBe(false);
  });
});

/**
 * The legacy `createScaleSite.jsp` / `updateScaleSite.jsp` capped each degrees-minutes-seconds part
 * with `maxlength`: 2 for latitude degrees, 3 for longitude degrees, 2 for every minutes and seconds
 * field. Without those caps a user can type an arbitrarily long number that only fails on submit.
 *
 * The caps count digits rather than characters. A character cap of 3 was enough for legacy, whose
 * coordinates were unsigned, but this app's DMS is signed (negative = W/S) -- and a 3-character cap
 * silently truncated `-123` to `-12`, a different in-range longitude that then failed the BC check.
 */
describe('DmsInput field length caps', () => {
  const emptyValue: DmsValue = { degrees: '', minutes: '', seconds: '' };

  const renderComponent = (props?: Partial<React.ComponentProps<typeof DmsInput>>) =>
    render(
      <DmsInput
        id="latitude"
        labelText="Latitude"
        value={emptyValue}
        onChange={vi.fn()}
        {...props}
      />,
    );

  it('caps degrees at 3 digits and minutes/seconds at 2 by default', () => {
    renderComponent();

    const { degrees, minutes, seconds } = parts();
    expect(degrees.getAttribute('maxlength')).toBe('3');
    expect(minutes.getAttribute('maxlength')).toBe('2');
    expect(seconds.getAttribute('maxlength')).toBe('2');
  });

  /** Latitude degrees never exceed 90, so the legacy form allowed only two digits there. */
  it('lets a caller cap degrees at 2 digits for latitude', () => {
    renderComponent({ degreesDigits: 2 });

    expect(parts().degrees.getAttribute('maxlength')).toBe('2');
  });

  /** The sign needs a character of its own, or the last digit gets pushed out. */
  it('allows one extra character for the sign when allowSign is set', () => {
    renderComponent({ degreesDigits: 3, allowSign: true });

    const { degrees, minutes, seconds } = parts();
    expect(degrees.getAttribute('maxlength')).toBe('4');
    // Minutes and seconds are always 0-59, so they never take a sign.
    expect(minutes.getAttribute('maxlength')).toBe('2');
    expect(seconds.getAttribute('maxlength')).toBe('2');
  });

  it('stops typing past the cap in each part', async () => {
    const onChange = vi.fn();
    renderComponent({ degreesDigits: 2, onChange });

    await userEvent.type(screen.getByPlaceholderText('Deg'), '123456');
    await userEvent.type(screen.getByPlaceholderText('Min'), '123456');
    await userEvent.type(screen.getByPlaceholderText('Sec'), '123456');

    for (const call of onChange.mock.calls) {
      const next = call[0] as DmsValue;
      expect(next.degrees.length).toBeLessThanOrEqual(2);
      expect(next.minutes.length).toBeLessThanOrEqual(2);
      expect(next.seconds.length).toBeLessThanOrEqual(2);
    }
  });

  /**
   * `maxlength` only constrains user editing -- a paste handled by the browser respects it, but the
   * onChange truncation is what keeps an over-length value out of form state on every path.
   */
  it('truncates an over-length pasted value', async () => {
    const onChange = vi.fn();
    renderComponent({ degreesDigits: 2, onChange });

    const degrees = screen.getByPlaceholderText('Deg');
    degrees.focus();
    await userEvent.paste('12345');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ degrees: '12' }));
  });

  /** The regression this pairs with: a 3-character cap turned `-123` into `-12`. */
  it('keeps a full signed longitude intact when allowSign is set', async () => {
    const onChange = vi.fn();
    renderComponent({ degreesDigits: 3, allowSign: true, onChange });

    const degrees = screen.getByPlaceholderText('Deg');
    degrees.focus();
    await userEvent.paste('-123');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ degrees: '-123' }));
  });

  it('counts the sign separately from the digit cap', async () => {
    const onChange = vi.fn();
    renderComponent({ degreesDigits: 3, allowSign: true, onChange });

    const degrees = screen.getByPlaceholderText('Deg');
    degrees.focus();
    await userEvent.paste('-12345');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ degrees: '-123' }));
  });

  it('treats a leading minus as an ordinary character when allowSign is not set', async () => {
    const onChange = vi.fn();
    renderComponent({ degreesDigits: 2, onChange });

    const degrees = screen.getByPlaceholderText('Deg');
    degrees.focus();
    await userEvent.paste('-49');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ degrees: '-4' }));
  });
});
