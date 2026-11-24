import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MultiValueInput from './index';

const setup = (props: Partial<React.ComponentProps<typeof MultiValueInput>> = {}) => {
  const onChange = vi.fn();
  const utils = render(
    <MultiValueInput id="marks" label="Timber Marks" values={[]} onChange={onChange} placeholder="Type a mark" {...props} />,
  );
  const input = utils.container.querySelector('#marks') as HTMLInputElement;
  return { ...utils, onChange, input };
};

describe('MultiValueInput', () => {
  it('adds the typed value on Enter, comma or blur, trimmed', () => {
    const { input, onChange } = setup();

    fireEvent.change(input, { target: { value: '  AB1 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['AB1']);
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'CD2' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenLastCalledWith(['CD2']);

    fireEvent.change(input, { target: { value: 'EF3' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(['EF3']);
  });

  it('ignores blank input and other keys', () => {
    const { input, onChange } = setup();

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'a' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('will not add a value that is already there', () => {
    const { input, onChange } = setup({ values: ['AB1'] });

    fireEvent.change(input, { target: { value: 'AB1' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('stops accepting values once the limit is reached', () => {
    const { input, onChange, container } = setup({ values: ['A', 'B'], maxItems: 2 });

    expect(input).toBeDisabled();
    expect(container.querySelector('.multi-value-input__shell')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(input, { target: { value: 'C' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a pill from its button', () => {
    const { onChange } = setup({ values: ['A', 'B'] });

    fireEvent.click(screen.getByRole('button', { name: 'Remove A' }));

    expect(onChange).toHaveBeenCalledWith(['B']);
  });

  it('removes the last pill on Backspace in an empty field, but not while typing', () => {
    const { input, onChange } = setup({ values: ['A', 'B'] });

    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith(['A']);
  });

  it('does nothing on Backspace when there are no pills', () => {
    const { input, onChange } = setup();

    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('flags invalid values case-insensitively and shows the message', () => {
    const { container } = setup({ values: ['ab1', 'CD2'], invalidValues: ['AB1'], invalidText: 'AB1 is not a known mark.' });

    const pills = container.querySelectorAll('.multi-value-input__pill');
    expect(pills[0]).toHaveClass('multi-value-input__pill--invalid');
    expect(pills[1]).not.toHaveClass('multi-value-input__pill--invalid');
    expect(container.querySelector('.multi-value-input__shell')).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('AB1 is not a known mark.');
  });

  it('shows no message without invalid values, or without text', () => {
    const first = setup({ values: ['AB1'], invalidText: 'Unused' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(first.container.querySelector('.multi-value-input__shell')).not.toHaveAttribute('data-invalid');
    first.unmount();

    setup({ values: ['AB1'], invalidValues: ['AB1'] });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the placeholder only while empty, and disables everything when asked', () => {
    const empty = setup();
    expect(empty.input).toHaveAttribute('placeholder', 'Type a mark');
    empty.unmount();

    const { input } = setup({ values: ['A'], disabled: true });
    expect(input).toHaveAttribute('placeholder', '');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove A' })).toBeDisabled();
  });

  it('caps a typed value at maxLength', () => {
    expect(setup({ maxLength: 12 }).input).toHaveAttribute('maxlength', '12');
  });

  it('sets no length cap by default', () => {
    expect(setup().input).not.toHaveAttribute('maxlength');
  });
});
