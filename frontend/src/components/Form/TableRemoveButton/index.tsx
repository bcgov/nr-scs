import type { FC, ReactNode } from 'react';

import TableActionButton from '@/components/Form/TableActionButton';
import type { TableActionButtonProps } from '@/components/Form/TableActionButton';

type TableRemoveButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
} & Pick<TableActionButtonProps, 'kind' | 'size' | 'type'>;

const TableRemoveButton: FC<TableRemoveButtonProps> = ({
  onClick,
  disabled = false,
  ariaLabel,
  children = 'Remove',
  kind = 'danger--ghost',
  size = 'sm',
  type = 'button',
}) => (
  <TableActionButton
    onClick={onClick}
    disabled={disabled}
    ariaLabel={ariaLabel}
    kind={kind}
    size={size}
    type={type}
    buttonLabel={typeof children === 'string' ? children : undefined}
    noIcon
  >
    {children}
  </TableActionButton>
);

export default TableRemoveButton;