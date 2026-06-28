import { Icon } from './Icon';

type Props = {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon = 'menu_book', title, description, action }: Props) {
  return (
    <div className="stitch-card flex flex-col items-center px-stack-lg py-stack-lg text-center">
      <div className="mb-stack-md flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
        <Icon name={icon} className="text-secondary" size={28} />
      </div>
      <h2 className="font-display text-headline-md text-primary">{title}</h2>
      <p className="mt-2 max-w-sm text-body-md text-on-surface-variant">{description}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="btn-stitch-primary mt-stack-md">
          {action.label}
        </button>
      )}
    </div>
  );
}
