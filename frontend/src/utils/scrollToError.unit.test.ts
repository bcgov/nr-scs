import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scrollToError } from './scrollToError';

/** Wait one macrotask so scrollToError's deferred setTimeout(0) has run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('scrollToError', () => {
  let scrollMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    // scrollIntoView lives on HTMLElement.prototype (test setup); spy there so it isn't shadowed.
    scrollMock = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('auto-detects the first Carbon --invalid control, scrolls it, and focuses its input', async () => {
    document.body.innerHTML = `
      <div class="cds--text-input"><input id="valid" /></div>
      <div class="cds--text-input cds--text-input--invalid"><input id="firstInvalid" /></div>
      <div class="cds--select--invalid"><select id="secondInvalid"></select></div>
    `;
    const firstInvalidInput = document.getElementById('firstInvalid');

    scrollToError(); // no argument => auto-detect
    await flush();

    expect(scrollMock).toHaveBeenCalledTimes(1);
    expect(scrollMock.mock.instances[0]).toBe(document.querySelector('.cds--text-input--invalid'));
    expect(document.activeElement).toBe(firstInvalidInput);
  });

  it('scrolls to and focuses an explicit field id', async () => {
    document.body.innerHTML = `<input id="target" /><input id="other" />`;
    const target = document.getElementById('target');

    scrollToError('target');
    await flush();

    expect(scrollMock).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(target);
  });

  it('falls back to the first error notification when no field is invalid (form-level-only errors)', async () => {
    // No `--invalid` control — just a form-level banner, as ScaleSite Create and the check-scale
    // "enter only one of…" rules produce.
    document.body.innerHTML = `
      <div class="cds--inline-notification cds--inline-notification--error" id="banner">
        <button class="cds--inline-notification__close-button">close</button>
      </div>
    `;
    const banner = document.getElementById('banner');

    scrollToError();
    await flush();

    expect(scrollMock).toHaveBeenCalledTimes(1);
    expect(scrollMock.mock.instances[0]).toBe(banner);
    // The banner's only focusable child is its dismiss button — it must not be focused.
    expect(document.activeElement).not.toBe(banner?.querySelector('button'));
  });

  it('prefers an invalid field over the banner when both are present', async () => {
    document.body.innerHTML = `
      <div class="cds--inline-notification--error"></div>
      <div class="cds--text-input cds--text-input--invalid"><input id="firstInvalid" /></div>
    `;

    scrollToError();
    await flush();

    expect(scrollMock).toHaveBeenCalledTimes(1);
    expect(scrollMock.mock.instances[0]).toBe(document.querySelector('.cds--text-input--invalid'));
  });

  it('is a no-op when nothing is invalid and there is no error banner (no argument)', async () => {
    document.body.innerHTML = `<input id="x" /><div class="cds--text-input"></div>`;

    scrollToError();
    await flush();

    expect(scrollMock).not.toHaveBeenCalled();
  });

  it('is a no-op for a null/empty id', async () => {
    document.body.innerHTML = `<input id="x" />`;

    scrollToError(null);
    scrollToError('');
    await flush();

    expect(scrollMock).not.toHaveBeenCalled();
  });
});
