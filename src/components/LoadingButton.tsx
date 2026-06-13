import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingLabel = 'Please wait…',
  variant = 'primary',
  disabled,
  children,
  className = '',
  ...props
}: Props) {
  const baseClass = variant === 'primary' ? 'btn-stitch-primary' : 'btn-stitch-secondary';

  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={`${baseClass} ${className} ${loading ? 'opacity-80' : ''}`.trim()}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
