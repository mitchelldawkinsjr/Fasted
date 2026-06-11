type Props = {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
  style?: React.CSSProperties;
};

export function Icon({ name, className = '', filled = false, size, style }: Props) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
      style={{ ...(size ? { fontSize: size } : {}), ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}
