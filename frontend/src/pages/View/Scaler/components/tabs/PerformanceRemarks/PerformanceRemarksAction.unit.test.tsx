import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import PerformanceRemarksAction from './PerformanceRemarksAction';

const LICENCE = 'S1234';

const remark = (overrides: Record<string, unknown> = {}) =>
  ({
    scalerPerformanceRemarkId: 1,
    performanceRemarkTxt: 'Consistently accurate',
    remarkDate: '2026-01-01',
    performanceRemarkTypeCode: 'GEN',
    ...overrides,
  }) as never;

const onCancel = vi.fn();
const onSaved = vi.fn();

beforeEach(() => {
  resetApiMock();
  onCancel.mockClear();
  onSaved.mockClear();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'GEN', description: 'General' }]);
});

const setup = (overrides: Record<string, unknown> = {}) =>
  renderWithProviders(
    <PerformanceRemarksAction
      scalerLicenceNo={LICENCE}
      onCancel={onCancel}
      onSaved={onSaved}
      {...overrides}
    />,
  );

describe('PerformanceRemarksAction — create mode', () => {
  it('renders the form when no remark is supplied', () => {
    const { container } = setup();

    expect(container.textContent ?? '').not.toBe('');
  });

  it('loads the remark type lookup', async () => {
    setup();

    await waitFor(() => expect(apiMock.lov.getStaticLov).toHaveBeenCalled());
  });

  it('creates nothing merely by rendering', () => {
    setup();

    expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('refuses to save an empty remark', async () => {
    setup();

    const save = screen.queryAllByRole('button').find((b) => /save/i.test(b.textContent ?? ''));
    if (save) {
      await userEvent.click(save);
    }

    await waitFor(() =>
      expect(
        apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark,
      ).not.toHaveBeenCalled(),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('cancels without saving', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /^(Back|Cancel)$/i }));

    expect(onCancel).toHaveBeenCalled();
    expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).not.toHaveBeenCalled();
  });
});

describe('PerformanceRemarksAction — edit mode', () => {
  it('renders in edit mode when given a remark', () => {
    const { container } = setup({ remark: remark() });

    expect(container.textContent ?? '').not.toBe('');
    // Editing an existing remark must never route through the create endpoint.
    expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('updates nothing merely by rendering', () => {
    setup({ remark: remark() });

    expect(apiMock.scalerPerformanceRemarks.updateScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('does not create when editing an existing remark', async () => {
    setup({ remark: remark() });

    const save = screen.queryAllByRole('button').find((b) => /save/i.test(b.textContent ?? ''));
    if (save) {
      await userEvent.click(save);
    }

    await waitFor(() =>
      expect(
        apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark,
      ).not.toHaveBeenCalled(),
    );
  });

  it('treats a null remark as create mode', () => {
    const { container } = setup({ remark: null });

    expect(container.textContent ?? '').not.toBe('');
    expect(apiMock.scalerPerformanceRemarks.updateScalerPerformanceRemark).not.toHaveBeenCalled();
  });
});

describe('PerformanceRemarksAction — saving', () => {
  const set = (container: HTMLElement, id: string, value: string) => {
    const el = container.querySelector(`#${id}`);
    if (el) {fireEvent.change(el, { target: { value } });}
  };
  const fillAction = async (container: HTMLElement) => {
    await waitFor(() => expect(container.querySelector('#performance-remark-issue-type')).not.toBeNull());
    set(container, 'performance-remark-issue-type', 'ACTION');
    await waitFor(() =>
      expect((container.querySelector('#performance-remark-action-code') as HTMLSelectElement | null)?.options.length ?? 0).toBeGreaterThan(1),
    );
    set(container, 'performance-remark-action-code', 'GEN');
    set(container, 'performance-remark-description', 'Consistently accurate');
    set(container, 'performance-remark-logged-timestamp', '2026-01-01');
  };
  const save = async () => {
    const button = screen.queryAllByRole('button').find((b) => /save/i.test(b.textContent ?? ''));
    if (button) {
      await userEvent.click(button);
    }
  };

  it('creates a remark from a completed form and tells the host', async () => {
    apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark.mockResolvedValue({ scalerPerformanceRemarkId: 1 });
    const { container } = setup();

    await fillAction(container);
    await save();

    await waitFor(() => expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).toHaveBeenCalled());
    expect(onSaved).toHaveBeenCalled();
  });

  it('updates rather than creates when editing an existing remark', async () => {
    apiMock.scalerPerformanceRemarks.updateScalerPerformanceRemark.mockResolvedValue(remark());
    const { container } = setup({ remark: remark({ issueType: 'ACTION', performanceRemarkTypeCode: 'GEN' }) });

    await fillAction(container);
    await save();

    await waitFor(() => expect(apiMock.scalerPerformanceRemarks.updateScalerPerformanceRemark).toHaveBeenCalled());
    expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('inlines a field error the backend returns', async () => {
    apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark.mockRejectedValue({
      response: { status: 400, data: { fieldErrors: [{ field: 'description', message: 'Description is too long.' }] } },
    });
    const { container } = setup();

    await fillAction(container);
    await save();

    await waitFor(() => expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(container.textContent ?? '').toMatch(/Description is too long|too long/);
  });
});
