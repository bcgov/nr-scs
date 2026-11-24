import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventHandler, sendEvent } from './eventHandler';
import type { EventType, GlobalEvent } from './types';

const globalEvent = (overrides: Partial<GlobalEvent> = {}): GlobalEvent => ({
  title: 'Saved',
  description: 'The record was saved.',
  eventType: 'success',
  ...overrides,
});

/**
 * `eventHandler` is a module-level singleton, so every test has to leave its listener
 * table as it found it — a leaked listener would fire during later tests.
 */
const registered: Array<() => void> = [];

const subscribe = (type: EventType, listener: (payload: GlobalEvent) => void) => {
  const unsubscribe = eventHandler.subscribe(type, listener);
  registered.push(unsubscribe);
  return unsubscribe;
};

beforeEach(() => {
  while (registered.length > 0) {
    registered.pop()?.();
  }
});

describe('eventHandler.subscribe / dispatch', () => {
  it('delivers a dispatched payload to its listener', () => {
    const listener = vi.fn();
    subscribe('success', listener);

    const payload = globalEvent();
    eventHandler.dispatch('success', payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers to every listener on the type, in subscription order', () => {
    const calls: string[] = [];
    subscribe('info', () => calls.push('first'));
    subscribe('info', () => calls.push('second'));

    eventHandler.dispatch('info', globalEvent({ eventType: 'info' }));

    expect(calls).toEqual(['first', 'second']);
  });

  it('keeps event types isolated from one another', () => {
    const onError = vi.fn();
    const onSuccess = vi.fn();
    subscribe('error', onError);
    subscribe('success', onSuccess);

    eventHandler.dispatch('error', globalEvent({ eventType: 'error' }));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('dispatching with no listeners is a no-op rather than a throw', () => {
    expect(() => eventHandler.dispatch('warning', globalEvent({ eventType: 'warning' }))).not.toThrow();
  });

  it('ignores an event type it has no bucket for', () => {
    // Reachable from the bridge, where `detail.eventType` is whatever the sender put there.
    expect(() =>
      eventHandler.dispatch('nonexistent' as EventType, globalEvent()),
    ).not.toThrow();
  });
});

describe('eventHandler.unsubscribe', () => {
  it('stops delivery via the function subscribe returned', () => {
    const listener = vi.fn();
    const unsubscribe = eventHandler.subscribe('info', listener);

    unsubscribe();
    eventHandler.dispatch('info', globalEvent({ eventType: 'info' }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops delivery when called directly with the listener', () => {
    const listener = vi.fn();
    subscribe('warning', listener);

    eventHandler.unsubscribe('warning', listener);
    eventHandler.dispatch('warning', globalEvent({ eventType: 'warning' }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('removes only the named listener, leaving its siblings subscribed', () => {
    const kept = vi.fn();
    const dropped = vi.fn();
    subscribe('info', kept);
    const unsubscribeDropped = eventHandler.subscribe('info', dropped);

    unsubscribeDropped();
    eventHandler.dispatch('info', globalEvent({ eventType: 'info' }));

    expect(kept).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
  });

  it('unsubscribing twice is harmless', () => {
    const listener = vi.fn();
    const unsubscribe = eventHandler.subscribe('error', listener);

    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
    eventHandler.dispatch('error', globalEvent({ eventType: 'error' }));

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('sendEvent bridge', () => {
  it('routes a window event through to the listeners for its type', () => {
    const listener = vi.fn();
    subscribe('error', listener);

    const payload = globalEvent({ eventType: 'error', title: 'Save failed' });
    sendEvent(payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('routes to the type named in the payload, not to every listener', () => {
    const onInfo = vi.fn();
    const onSuccess = vi.fn();
    subscribe('info', onInfo);
    subscribe('success', onSuccess);

    sendEvent(globalEvent({ eventType: 'info' }));

    expect(onInfo).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('carries the optional timeout through unchanged', () => {
    const listener = vi.fn();
    subscribe('success', listener);

    sendEvent(globalEvent({ timeout: 8000 }));

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ timeout: 8000 }));
  });

  it('ignores a bridged event carrying no detail', () => {
    const listener = vi.fn();
    subscribe('success', listener);

    window.dispatchEvent(new CustomEvent('global-app-event'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores unrelated window events', () => {
    const listener = vi.fn();
    subscribe('success', listener);

    window.dispatchEvent(new CustomEvent('some-other-event', { detail: globalEvent() }));

    expect(listener).not.toHaveBeenCalled();
  });
});
