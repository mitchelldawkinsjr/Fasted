type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
};

export function FocusModeToggle({ enabled, onChange, className = '' }: Props) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 ${className}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
        Focus mode
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Focus mode"
        onClick={() => onChange(!enabled)}
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-secondary' : 'bg-outline-variant/40'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-3 rounded-full bg-surface-container-lowest shadow-sm transition-transform ${
            enabled ? 'translate-x-3.5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
