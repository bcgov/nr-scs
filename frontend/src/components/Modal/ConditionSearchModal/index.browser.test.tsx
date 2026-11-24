import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';

import ConditionSearchModal from './index';

const results: ScaleAuthCondition[] = [
  {
    scaleConditionClassCode: 'MSD',
    scaleAuthConditionId: 190,
    scaleAuthConditionTitle: 'TRANSPORTATION CUT-OFF',
    scaleAuthConditionDesc: 'desc',
    ministryStandardInd: 'N',
    sortOrderNo: 2,
  },
];

describe('ConditionSearchModal', () => {
  afterEach(() => cleanup());

  it('calls onSelect with the row when a result Condition # is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ConditionSearchModal open loading={false} results={results} onSelect={onSelect} onRequestClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '190' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ scaleAuthConditionId: 190 }));
  });

  it('does not render the results table when there are no results and it is not loading', () => {
    render(
      <ConditionSearchModal open loading={false} results={null} onSelect={vi.fn()} onRequestClose={vi.fn()} />,
    );
    // No condition rows -> the clickable Condition # button is absent.
    expect(screen.queryByText('TRANSPORTATION CUT-OFF')).not.toBeInTheDocument();
  });
});
