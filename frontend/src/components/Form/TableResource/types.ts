export type TableHeaderType<T, K extends keyof T = keyof T> = {
  key: K;
  header: string;
  selected?: boolean;
  sortable?: boolean;
  // renderAs function should expect as arguments the value of the key in T
  // and optionally the full row, returning a React node to be rendered in the table cell
  // Example: renderAs: (value, row) => <a onClick={() => doSomethingWith(row)}>{value}</a>
  renderAs?: (value: T[K], row?: T) => React.ReactNode;
};

export type PaginationOnChangeType = {
  page: number;
  pageSize: number;
  ref?: React.RefObject<unknown>;
};

export type IdentifiableContent<T> = { id: string | number } & T;

export type PageType = {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
};

export type PageableResponse<T> = {
  content: IdentifiableContent<T>[];
  page: PageType;
};

export type SortDirectionType = 'ASC' | 'DESC' | 'NONE';

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) {
    return value;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export const renderCell = <T, K extends keyof T>(
  row: T,
  header: TableHeaderType<T, K>
): React.ReactNode => {
  const value = row[header.key];
  // If a custom renderer is provided, prefer it (renderer can handle undefined/null)
  if (header.renderAs) {
    return header.renderAs(value, row);
  }
  if (value === null || value === undefined) {
    return '';
  }
  const rawValue = String(value);
  const keyName = String(header.key).toLowerCase();
  if (keyName.includes('phone')) {
    return formatPhoneNumber(rawValue);
  }
  return rawValue;
};
