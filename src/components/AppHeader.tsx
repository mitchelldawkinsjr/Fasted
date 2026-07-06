import { Link } from 'react-router-dom';
import { Icon } from './Icon';

const LOGO_SRC = '/assets/logo.png';

type Props = {
  title?: string;
  showPhasesLink?: boolean;
};

function BrandLogo() {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-lg object-cover"
    />
  );
}

export function AppHeader({ title = 'Fasted', showPhasesLink = true }: Props) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-surface px-container-margin py-unit shadow-grace">
      <div className="flex min-w-0 items-center gap-stack-sm">
        {showPhasesLink ? (
          <Link to="/phases" className="flex min-w-0 items-center gap-stack-sm text-primary transition-opacity hover:opacity-80">
            <BrandLogo />
            <h1 className="truncate font-display text-headline-md text-primary">{title}</h1>
          </Link>
        ) : (
          <>
            <BrandLogo />
            <h1 className="truncate font-display text-headline-md text-primary">{title}</h1>
          </>
        )}
      </div>
      <Link
        to="/settings"
        className="text-primary transition-all hover:opacity-80 active:scale-95"
        aria-label="Account and settings"
        data-tour="account-settings"
      >
        <Icon name="account_circle" size={28} />
      </Link>
    </header>
  );
}
