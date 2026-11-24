/**
 * Jumps a form to its first error: defers a tick (so the post-render/invalid DOM is present), then
 * smooth-scrolls the target into view and focuses it.
 *
 * - `scrollToError()` — no argument: finds the first invalid control via Carbon's `…--invalid` class
 *   (e.g. `cds--text-input--invalid`, `cds--select--invalid`, `cds--radio-button-group--invalid`),
 *   which every Carbon control variant sets — so it picks the topmost error in document order with no
 *   per-form config. When a submission fails with only a form-level error (a banner and no invalid
 *   field — e.g. ScaleSite Create, or the check-scale "enter only one of…" rules), it falls back to
 *   the first error notification so the jump isn't a silent no-op.
 * - `scrollToError(fieldId)` — explicit element id, for callers that resolve the first-error field
 *   themselves. `null`/empty id is a no-op.
 *
 * No-op outside a browser.
 */
export function scrollToError(fieldId?: string | null): void {
  if (typeof document === 'undefined') {
    return;
  }

  setTimeout(() => {
    if (fieldId === undefined) {
      // Auto-detect: first invalid control in document order wins; focus it so typing resumes there.
      const invalid = document.querySelector<HTMLElement>('[class*="--invalid"]');
      if (invalid) {
        scrollAndFocus(invalid);
        return;
      }
      // Form-level-only failures render just a banner (no invalid field). Scroll it into view so
      // the error is at least brought on-screen — but don't focus: the notification's only
      // focusable child is its dismiss button, which we don't want to steal focus to.
      const banner = document.querySelector<HTMLElement>('.cds--inline-notification--error');
      banner?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      return;
    }

    if (!fieldId) {
      return;
    }
    const target = document.getElementById(fieldId);
    if (target) {
      scrollAndFocus(target);
    }
  }, 0);
}

function scrollAndFocus(target: HTMLElement): void {
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  const focusable = target.matches('input, select, textarea, button')
    ? target
    : target.querySelector<HTMLElement>('input, select, textarea, button');
  focusable?.focus({ preventScroll: true });
}
