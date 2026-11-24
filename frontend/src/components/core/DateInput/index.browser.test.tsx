import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import DateInput from './index';

/**
 * `DateInput` is controlled, so a bare `vi.fn()` onChange would leave `value` pinned at `''` and
 * flatpickr would never re-sync — the assertions would then pass with the fix removed. This harness
 * feeds every emitted value back in, which is what makes the regression below detectable.
 */
const Harness = () => {
  const [value, setValue] = useState('');
  return (
    <>
      <DateInput id="d" value={value} onChange={setValue} ariaLabel="Test date" />
      <span data-testid="form-state">{value}</span>
    </>
  );
};

const typeAndBlur = async (text: string) => {
  render(<Harness />);
  const input = screen.getByLabelText('Test date') as HTMLInputElement;
  await userEvent.click(input);
  await userEvent.type(input, text);
  await userEvent.tab();
  return { displayed: input.value, formState: screen.getByTestId('form-state').textContent };
};

describe('DateInput', () => {
  it('keeps a valid date as entered', async () => {
    const { displayed, formState } = await typeAndBlur('2026-02-28');

    expect(displayed).toBe('2026-02-28');
    expect(formState).toBe('2026-02-28');
  });

  /**
   * Regression: flatpickr's default parser silently overflowed a calendar-invalid entry — Feb 30
   * became Mar 2 in the visible field while form state kept `2026-02-30`, so the date on screen and
   * the date about to be submitted disagreed with no error shown. A strict `parseDate` now refuses
   * to invent a different date.
   */
  it('does not silently roll a non-existent day over to the next month', async () => {
    const { displayed, formState } = await typeAndBlur('2026-02-30');

    // The invalid entry is never turned into a different, valid-looking date...
    expect(displayed).not.toBe('2026-03-02');
    // ...and it stays in form state, where the owning form's validator (or the backend) rejects it
    // visibly, rather than being silently dropped.
    expect(formState).toBe('2026-02-30');
  });

  it('does not silently roll an out-of-range month over to the next year', async () => {
    const { displayed, formState } = await typeAndBlur('2026-13-01');

    expect(displayed).not.toBe('2027-01-01');
    expect(formState).toBe('2026-13-01');
  });

  /**
   * The user-facing contract QA asked for: an invalid entry must stay on screen with a message, not
   * vanish. Previously the picker blanked what it could not parse, so the field looked empty and the only
   * trace was `Error: Invalid date provided:` in the console — nothing a user would ever see.
   */
  it('keeps an invalid entry visible in the field so it can be corrected', async () => {
    const { displayed, formState } = await typeAndBlur('2026-09-31');

    expect(displayed).toBe('2026-09-31');
    expect(formState).toBe('2026-09-31');
  });

  it('still clears the field when the value is reset to empty', async () => {
    // The '' case must keep reaching flatpickr, or a form reset would leave stale text behind.
    render(<Harness />);
    const input = screen.getByLabelText('Test date') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, '2026-02-28');
    await userEvent.tab();
    expect(input.value).toBe('2026-02-28');

    await userEvent.clear(input);
    await userEvent.tab();
    expect(input.value).toBe('');
  });

  it('caps entry at ten characters', async () => {
    render(<Harness />);
    expect(screen.getByLabelText('Test date').getAttribute('maxlength')).toBe('10');
  });

  /**
   * Typed-entry shorthand, normalised when the user clicks off the field. Reshaping only — whether the
   * result is a real date is asked on submit, so these assert the FIELD, not an error.
   */
  it.each([
    ['20260105', '2026-01-05', 'eight digits'],
    ['260105', '2601-05', 'digits-only is positional: a four-digit year and a month'],
    ['2026010599', '2026-01-05', 'over eight digits keeps the first eight'],
    ['26-1-5', '2026-01-05', 'two-digit year and single-digit parts'],
    ['2026-1-', '2026-01-', 'completed only as far as typed'],
  ])('normalises %s to %s on blur (%s)', async (typed, expected) => {
    const { displayed, formState } = await typeAndBlur(typed);

    expect(displayed).toBe(expected);
    expect(formState).toBe(expected);
  });

  it('shows an impossible date back rather than correcting it', async () => {
    // 2026-07-32 must stay visible; the form rejects it on submit. Silently showing 2026-08-01 is the
    // overflow this work exists to remove.
    const { displayed, formState } = await typeAndBlur('20260732');

    expect(displayed).toBe('2026-07-32');
    expect(formState).toBe('2026-07-32');
  });

  /**
   * Regression, found in manual testing on the Scaler Register report: typing 20260708 and CLICKING AWAY
   * returned a blank field, while tabbing away worked. flatpickr's close handler blanks the input before
   * the blur event, so the handler read '' and normalised that to ''. The two exit paths must agree.
   */
  describe('exit path parity', () => {
    const typeThen = async (typed: string, exit: 'tab' | 'click') => {
      render(
        <>
          <button type="button" data-testid="elsewhere">elsewhere</button>
          <Harness />
        </>,
      );
      const input = screen.getByLabelText('Test date') as HTMLInputElement;
      await userEvent.click(input);
      await userEvent.type(input, typed);
      if (exit === 'tab') {
        await userEvent.tab();
      } else {
        await userEvent.click(screen.getByTestId('elsewhere'));
      }
      return { displayed: input.value, formState: screen.getByTestId('form-state').textContent };
    };

    it.each([
      ['tab', '20260708', '2026-07-08'],
      ['click', '20260708', '2026-07-08'],
      ['tab', '20-2-2', '2020-02-02'],
      ['click', '20-2-2', '2020-02-02'],
    ] as const)('leaving by %s normalises %s to %s', async (exit, typed, expected) => {
      const { displayed, formState } = await typeThen(typed, exit);

      expect(displayed).toBe(expected);
      expect(formState).toBe(expected);
    });

    it('still reports an emptied field as empty, rather than resurrecting the old text', async () => {
      // The fallback above remembers what was typed, so this pins that it cannot bring back a value the
      // user has deliberately deleted.
      render(
        <>
          <button type="button" data-testid="elsewhere">elsewhere</button>
          <Harness />
        </>,
      );
      const input = screen.getByLabelText('Test date') as HTMLInputElement;
      await userEvent.click(input);
      await userEvent.type(input, '20260708');
      await userEvent.click(screen.getByTestId('elsewhere'));
      expect(input.value).toBe('2026-07-08');

      await userEvent.clear(input);
      await userEvent.click(screen.getByTestId('elsewhere'));

      expect(input.value).toBe('');
      expect(screen.getByTestId('form-state').textContent).toBe('');
    });

    it('keeps an invalid edit of an existing date when clicking away', async () => {
      // Guards the Reset fix below: clearing the remembered text on a change to '' must not also drop an
      // entry the user is editing when the picker blanks the field on close.
      render(
        <>
          <button type="button" data-testid="elsewhere">elsewhere</button>
          <Harness />
        </>,
      );
      const input = screen.getByLabelText('Test date') as HTMLInputElement;
      await userEvent.click(input);
      await userEvent.type(input, '2026-01-05');
      await userEvent.click(screen.getByTestId('elsewhere'));
      expect(input.value).toBe('2026-01-05');

      await userEvent.click(input);
      await userEvent.clear(input);
      await userEvent.type(input, '2026-02-30');
      await userEvent.click(screen.getByTestId('elsewhere'));

      expect(input.value).toBe('2026-02-30');
      expect(screen.getByTestId('form-state').textContent).toBe('2026-02-30');
    });

    /**
     * Regression from nr-scs PR #314: the remembered typed text survived a parent Reset, so the next click-away
     * blur (which reads '' from the field and falls back to the remembered text) resurrected the entry
     * the Reset had just cleared.
     */
    it('does not resurrect a typed entry after the parent resets the value', async () => {
      const ResetHarness = () => {
        const [value, setValue] = useState('');
        return (
          <>
            <button type="button" data-testid="elsewhere">elsewhere</button>
            <button type="button" data-testid="reset" onClick={() => setValue('')}>reset</button>
            <DateInput id="d" value={value} onChange={setValue} ariaLabel="Test date" />
            <span data-testid="form-state">{value}</span>
          </>
        );
      };
      render(<ResetHarness />);
      const input = screen.getByLabelText('Test date') as HTMLInputElement;
      await userEvent.click(input);
      await userEvent.type(input, '2026-02-30');
      await userEvent.click(screen.getByTestId('reset'));
      expect(input.value).toBe('');
      expect(screen.getByTestId('form-state').textContent).toBe('');

      await userEvent.click(input);
      await userEvent.click(screen.getByTestId('elsewhere'));

      expect(input.value).toBe('');
      expect(screen.getByTestId('form-state').textContent).toBe('');
    });
  });
});
