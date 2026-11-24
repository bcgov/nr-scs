import { type ComponentPropsWithoutRef, type FC, type ReactNode } from 'react';

import Button from '@/components/core/Button';

export type TableActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
  kind?: ComponentPropsWithoutRef<typeof Button>['kind'];
  size?: ComponentPropsWithoutRef<typeof Button>['size'];
  type?: ComponentPropsWithoutRef<typeof Button>['type'];
  buttonLabel?: string;
  noIcon?: boolean;
  className?: string;
};

const TableActionButton: FC<TableActionButtonProps> = ({
  onClick,
  disabled = false,
  ariaLabel,
  children,
  kind,
  size = 'sm',
  type = 'button',
  buttonLabel,
  noIcon = true,
  className,
}) => (
  <div className="scs__table-actions">
    <Button
      kind={kind}
      size={size}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      buttonLabel={buttonLabel}
      noIcon={noIcon}
      className={className}
    >
      {children}
    </Button>
  </div>
);

export default TableActionButton;