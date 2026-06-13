import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  children: ReactNode;
  icon?: string;
  variant?: 'info' | 'preview' | 'phase';
  action?: ReactNode;
  className?: string;
};

const VARIANT_STYLES = {
  info: 'border-primary-container bg-surface-container-high',
  preview: 'border-secondary bg-secondary/10',
  phase: 'border-outline-variant bg-surface-container-high',
};

export function InfoBanner({
  children,
  icon = 'info',
  variant = 'info',
  action,
  className = '',
}: Props) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-l-4 px-3 py-2 text-body-md text-on-surface-variant ${VARIANT_STYLES[variant]} ${className}`.trim()}
      role="status"
    >
      <Icon name={icon} className="mt-0.5 shrink-0 text-secondary" size={20} />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
