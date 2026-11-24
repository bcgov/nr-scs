import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationProvider } from './NotificationProvider';
import { useNotification } from './useNotification';

const Trigger = ({ content }: { content: Record<string, unknown> }) => {
  const { display } = useNotification();
  return (
    <button type="button" onClick={() => display(content as never)}>
      notify
    </button>
  );
};

const setup = (content: Record<string, unknown>) =>
  render(
    <NotificationProvider>
      <Trigger content={content} />
    </NotificationProvider>,
  );

afterEach(() => vi.useRealTimers());

describe('NotificationProvider', () => {
  it('shows a toast on display and hides it again on close, telling the caller', () => {
    const onClose = vi.fn();
    setup({ title: 'Saved', subtitle: 'Record saved.', kind: 'success', timeout: 0, onClose });

    fireEvent.click(screen.getByRole('button', { name: 'notify' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();

    fireEvent.click((screen.getByText('Saved').closest('.cds--toast-notification') as HTMLElement).querySelector('button')!);

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('starts sliding a timed toast out just before its timeout', () => {
    vi.useFakeTimers();
    setup({ title: 'Heads up', kind: 'info', timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: 'notify' }));
    const toast = () => screen.getByText('Heads up').closest('.cds--toast-notification') as HTMLElement;
    expect(toast().className).toContain('slide-in');

    act(() => {
      vi.advanceTimersByTime(1700);
    });

    expect(toast().className).toContain('slide-out');
  });

  it('leaves an untimed toast alone', () => {
    vi.useFakeTimers();
    setup({ title: 'Stays', kind: 'warning', timeout: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'notify' }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText('Stays').closest('.cds--toast-notification')?.className).toContain('slide-in');
  });
});
