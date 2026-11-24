import { Add, ArrowLeft, ArrowRight, Checkmark, Close, Edit, Login, Logout, Reset, Renew, Save, Search, Send, Time, TrashCan, View } from '@carbon/icons-react';
import { Button as CarbonButton } from '@carbon/react';
import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';

type CarbonButtonProps = ComponentPropsWithoutRef<typeof CarbonButton>;

type ButtonConfig = {
  kind: CarbonButtonProps['kind'];
  renderIcon?: CarbonButtonProps['renderIcon'];
};

const EXACT_BUTTON_CONFIG: Record<string, ButtonConfig> = {
  search: { kind: 'primary', renderIcon: Search },
  refresh: { kind: 'secondary', renderIcon: Renew },
  reset: { kind: 'secondary', renderIcon: Reset },
  back: { kind: 'secondary', renderIcon: ArrowLeft },
  cancel: { kind: 'secondary', renderIcon: Close },
  close: { kind: 'secondary', renderIcon: Close },
  apply: { kind: 'primary', renderIcon: Checkmark },
  update: { kind: 'primary', renderIcon: Edit },
  history: { kind: 'secondary', renderIcon: Time },
  delete: { kind: 'danger', renderIcon: TrashCan },
  remove: { kind: 'danger--ghost', renderIcon: TrashCan },
  logout: { kind: 'secondary', renderIcon: Logout },
  next: { kind: 'secondary', renderIcon: ArrowRight },
};

const PREFIX_BUTTON_CONFIG: Array<[string, ButtonConfig]> = [
  ['save', { kind: 'primary', renderIcon: Save }],
  ['add', { kind: 'primary', renderIcon: Add }],
  ['create', { kind: 'primary', renderIcon: Add }],
  ['edit', { kind: 'primary', renderIcon: Edit }],
  ['view', { kind: 'primary', renderIcon: View }],
  ['send', { kind: 'primary', renderIcon: Send }],
  ['log in', { kind: 'primary', renderIcon: Login }],
];

const normalizeLabel = (value: string) => {
  const trimmed = value.trim().replace(/[.…]+$/u, '').toLowerCase();

  if (trimmed === 'searching' || trimmed === 'searching...') {
    return 'search';
  }
  if (trimmed === 'saving' || trimmed === 'saving...') {
    return 'save record';
  }
  if (trimmed === 'loading' || trimmed === 'loading...') {
    return 'search';
  }
  if (trimmed === 'logging in' || trimmed === 'logging in...') {
    return 'login';
  }
  if (trimmed === 'updating' || trimmed === 'updating...') {
    return 'update';
  }
  if (trimmed === 'deleting' || trimmed === 'deleting...') {
    return 'delete';
  }

  return trimmed;
};

const extractLabel = (children: ReactNode, buttonLabel?: string): string | null => {
  if (typeof buttonLabel === 'string' && buttonLabel.trim()) {
    return buttonLabel;
  }

  const collectText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }

    if (Array.isArray(node)) {
      return node.map(collectText).join('');
    }

    if (isValidElement(node)) {
      return collectText(node.props.children);
    }

    return '';
  };

  const text = collectText(Children.toArray(children));
  if (text.trim()) {
    return text;
  }

  return null;
};

const getButtonConfig = (label: string): ButtonConfig | undefined => {
  const normalizedLabel = normalizeLabel(label);

  const exactConfig = EXACT_BUTTON_CONFIG[normalizedLabel];
  if (exactConfig) {
    return exactConfig;
  }

  return PREFIX_BUTTON_CONFIG.find(([prefix]) => normalizedLabel.startsWith(prefix))?.[1];
};

const hasInputSearchClass = (className: CarbonButtonProps['className']) =>
  typeof className === 'string' && /\b(scs__input-search-button|cds--btn--field)\b/.test(className);

const Button = ({
  children,
  buttonLabel,
  noIcon,
  kind,
  renderIcon,
  className,
  size = 'md',
  ...rest
}: CarbonButtonProps & { buttonLabel?: string; noIcon?: boolean }) => {
  const label = extractLabel(children, buttonLabel);
  const config = label ? getButtonConfig(label) : undefined;
  const normalizedLabel = label ? normalizeLabel(label) : null;
  const searchConfig = normalizedLabel === 'search' && hasInputSearchClass(className)
    ? { kind: 'secondary', renderIcon: Search }
    : undefined;

  return (
    <CarbonButton
      {...rest}
      size={size}
      className={className}
      kind={searchConfig?.kind ?? kind ?? config?.kind}
      renderIcon={noIcon ? undefined : (searchConfig?.renderIcon ?? config?.renderIcon ?? renderIcon)}
    >
      {children}
    </CarbonButton>
  );
};

export default Button;