type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  inputClass: string;
  isActive: boolean;
  onOpen: () => void;
};

export function JournalTextField({
  value,
  placeholder,
  ariaLabel,
  inputClass,
  isActive,
  onOpen,
}: Props) {
  return (
    <button
      type="button"
      onPointerDown={onOpen}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        if (event.detail === 0) onOpen();
      }}
      aria-label={value.trim() ? `${ariaLabel}: ${value}` : ariaLabel}
      aria-current={isActive ? 'true' : undefined}
      aria-hidden={isActive || undefined}
      tabIndex={isActive ? -1 : 0}
      className={`${inputClass} min-h-[4.5rem] cursor-text text-left`}
    >
      <span
        className={`block whitespace-pre-wrap text-wrap-anywhere ${
          value.trim() ? 'text-on-surface' : 'text-on-surface-variant'
        }`}
      >
        {value.trim() || placeholder}
      </span>
    </button>
  );
}
