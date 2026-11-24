import { Search } from '@carbon/react';
import { type FC } from 'react';

/**
 * Props for the SearchInput component.
 *
 * @property {string} id - Unique identifier for the search input.
 * @property {string} titleText - The title text for the input.
 * @property {string} placeholder - Placeholder text for the input field.
 * @property {string} value - The current value of the search input.
 * @property {(value: string) => void} onChange - Callback fired when the input value changes.
 */
type SearchInputProps = {
  id: string;
  titleText: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * SearchInput is a reusable search field built on Carbon's Search component.
 * It provides a controlled input for search queries: the current value is reported
 * when the field loses focus, and Enter blurs the field so the value is reported too.
 *
 * @param {SearchInputProps} props - The props for the component.
 * @returns {JSX.Element} The rendered SearchInput component.
 */
const SearchInput: FC<SearchInputProps> = ({ id, titleText, placeholder, onChange, value }) => {
  return (
    <Search
      aria-label={titleText}
      data-testid={id}
      placeholder={placeholder}
      labelText={titleText}
      closeButtonLabelText="Clear search input"
      id={id}
      onBlur={(e) => {
        onChange(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      defaultValue={value}
    />
  );
};

export default SearchInput;
