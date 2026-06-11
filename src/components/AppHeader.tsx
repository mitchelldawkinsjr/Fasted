import { Link } from 'react-router-dom';
import { Icon } from './Icon';

type Props = {
  title?: string;
  showPhasesLink?: boolean;
};

export function AppHeader({ title = 'Fasted Calendar', showPhasesLink = true }: Props) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-surface px-container-margin py-unit shadow-grace">
      <div className="flex min-w-0 items-center gap-stack-sm">
        {showPhasesLink ? (
          <Link to="/phases" className="flex min-w-0 items-center gap-stack-sm text-primary transition-opacity hover:opacity-80">
            <Icon name="menu_book" />
            <h1 className="truncate font-display text-headline-md text-primary">{title}</h1>
          </Link>
        ) : (
          <>
            <Icon name="menu_book" className="text-primary" />
            <h1 className="truncate font-display text-headline-md text-primary">{title}</h1>
          </>
        )}
      </div>
      <button
        type="button"
        className="text-primary transition-all hover:opacity-80 active:scale-95"
        aria-label="Account"
      >
        <Icon name="account_circle" size={28} />
      </button>
    </header>
  );
}
