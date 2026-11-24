import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RegionDistrictRollupLov } from '@/services/lov.service';

import RegDistSelect from './index';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: vi.fn().mockResolvedValue('token') }),
}));

const lov = vi.hoisted(() => ({ data: [] as RegionDistrictRollupLov[] }));
vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: () => ({ data: lov.data, isLoading: false, error: null }),
}));

afterEach(() => sessionStorage.clear());

const texts = (container: HTMLElement) => Array.from(container.querySelectorAll('option')).map((o) => (o.textContent ?? '').trim());

describe('RegDistSelect — option wording', () => {
  it('strips the org unit code, or the numeric code, from the front of a description', () => {
    lov.data = [
      { code: 100, description: 'RNI - Northern Interior', rollupRegionNo: 100, orgUnitCode: 'RNI' },
      { code: 201, description: '201: Prince George', rollupRegionNo: 100, orgUnitCode: 'DPG' },
      { code: 202, description: 'Nadina', rollupRegionNo: 100, orgUnitCode: 'DND' },
      { code: 203, description: 'DXX', rollupRegionNo: 100, orgUnitCode: '' },
    ] as never;
    const { container } = render(<RegDistSelect value="" onChange={vi.fn()} labelText="Reg / Dist" />);

    const all = texts(container);
    expect(all.length).toBeGreaterThanOrEqual(4);
    expect(all.some((t) => t.includes('Northern Interior'))).toBe(true);
    expect(all.some((t) => t.includes('Prince George') || t.includes('201'))).toBe(true);
  });
});

describe('RegDistSelect — remembered selection', () => {
  it('restores a remembered choice on mount and remembers a new one', () => {
    lov.data = [{ code: 100, description: 'RNI - Northern Interior', rollupRegionNo: 100, orgUnitCode: 'RNI' }] as never;
    sessionStorage.setItem('reg-dist:remembered', 'RNI');
    const onChange = vi.fn();
    const { container } = render(
      <RegDistSelect id="remembered" value="" onChange={onChange} labelText="Reg / Dist" persistSelection />,
    );

    expect(onChange).toHaveBeenCalledWith('RNI');

    fireEvent.change(container.querySelector('select')!, { target: { value: 'RNI' } });
    expect(sessionStorage.getItem('reg-dist:remembered')).toBe('RNI');
  });

  it('uses the supplied key and leaves storage alone when not persisting', () => {
    lov.data = [{ code: 100, description: 'RNI - Northern Interior', rollupRegionNo: 100, orgUnitCode: 'RNI' }] as never;
    sessionStorage.setItem('my-key', 'RNI');
    const remembered = vi.fn();
    render(<RegDistSelect id="x" value="" onChange={remembered} labelText="Reg / Dist" persistSelection persistKey="my-key" />);
    expect(remembered).toHaveBeenCalledWith('RNI');

    const plain = vi.fn();
    const { container } = render(<RegDistSelect id="plain" value="" onChange={plain} labelText="Reg / Dist" />);
    fireEvent.change(container.querySelector('select')!, { target: { value: 'RNI' } });
    expect(sessionStorage.getItem('reg-dist:plain')).toBeNull();
    expect(plain).toHaveBeenCalledWith('RNI');
  });
});
