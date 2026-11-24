import { configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(), // Legacy method
      removeListener: vi.fn(), // Legacy method
      addEventListener: vi.fn(), // Modern method
      removeEventListener: vi.fn(), // Modern method
      dispatchEvent: vi.fn(),
    };
  };

// Must be a real (newable) class — Carbon's TextArea calls `new ResizeObserver(...)`,
// and an arrow-function mock has no [[Construct]] slot.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (globalThis.SVGElement?.prototype) {
  Object.defineProperty(globalThis.SVGElement.prototype, 'getScreenCTM', {
    writable: true,
    value: vi.fn(),
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'getBBox', {
    writable: true,
    value: vi.fn().mockReturnValue({
      x: 0,
      y: 0,
    }),
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'getComputedTextLength', {
    writable: true,
    value: vi.fn().mockReturnValue(220),
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'transform', {
    writable: true,
    value: {
      baseVal: {
        consolidate: vi.fn(() => {}),
      },
    },
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'createSVGMatrix', {
    writable: true,
    value: vi.fn().mockReturnValue({
      x: 10,
      y: 10,
      inverse: () => {},
      multiply: () => {},
    }),
  });
}

// happy-dom does not implement the blocking dialogs; default to the user cancelling so tests must
// opt in with `vi.spyOn(window, 'confirm').mockReturnValue(true)`.
if (typeof window.confirm !== 'function') {
  window.confirm = () => false;
}

if (window.HTMLElement?.prototype) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}

// happy-dom may ship without window.crypto; only stand one in when it is missing, like the confirm shim
// above, so a real implementation is never replaced by this stub (its randomUUID is not a UUID and
// its digest is empty).
if (!window.crypto?.randomUUID) {
  Object.defineProperty(window, 'crypto', {
    value: {
      randomUUID: () => Math.random().toString(36).substring(2),
      subtle: {
        digest: () => Promise.resolve(new ArrayBuffer(0)),
      },
    },
  });
}

// Testing Library's default 1s async timeout is not enough once the whole suite runs in parallel:
// a page whose load resolves promptly in isolation can miss it while workers compete for the CPU.
// That produced failures that reproduced only in the full run and passed on their own, which reads
// as a defect in the page rather than in the harness. The waits are still bounded.
configure({ asyncUtilTimeout: 5000 });
