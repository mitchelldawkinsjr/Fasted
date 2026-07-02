import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AuthReturnRedirect } from './AuthReturnRedirect';
import { AppHeader } from './AppHeader';
import { Icon } from './Icon';
import { ConfirmModal } from './ConfirmModal';
import { InstallPromptToast } from './InstallPromptToast';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';
import { SyncToastWatcher } from './SyncToastWatcher';
import { ToastHost } from './ToastHost';
import { useActiveJourney } from '../hooks/useActiveJourney';

const baseNavItems = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar_month' },
  { to: '/journal', label: 'Journal', icon: 'menu_book' },
  { to: '/progress', label: 'Progress', icon: 'query_stats' },
  { to: '/groups', label: 'Groups', icon: 'groups' },
];

const DEFAULT_HEADER_TITLE = 'Fasted';

const pageTitles: Record<string, string> = {
  '/': DEFAULT_HEADER_TITLE,
  '/calendar': DEFAULT_HEADER_TITLE,
  '/journal': 'My Spiritual Journal',
  '/progress': DEFAULT_HEADER_TITLE,
  '/progress/mood': 'Your Sacred Journey',
  '/progress/badges': 'Sacred Milestones',
  '/phases': DEFAULT_HEADER_TITLE,
  '/groups': 'Your Groups',
  '/settings': DEFAULT_HEADER_TITLE,
};

export function Layout() {
  const { pathname } = useLocation();
  const { journey } = useActiveJourney();
  const pageTitle = pathname.startsWith('/progress/milestones/')
    ? 'Milestone'
    : (pageTitles[pathname] ?? DEFAULT_HEADER_TITLE);
  const journeyAwarePaths = new Set(['/', '/calendar', '/phases', '/progress']);
  const title =
    journeyAwarePaths.has(pathname) && !journey.isDefault ? journey.name : pageTitle;

  return (
    <div className="relative mx-auto min-h-screen max-w-lg pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none fixed inset-0 linen-texture" aria-hidden />
      <AppHeader title={title} showPhasesLink={pathname !== '/phases'} />

      <main className="relative z-10 px-container-margin pb-stack-lg pt-[72px]">
        <Outlet />
      </main>

      <ToastHost />
      <SyncToastWatcher />
      <AuthReturnRedirect />
      <ConfirmModal />
      <InstallPromptToast />
      <PwaUpdatePrompt />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl bg-surface-container-lowest px-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 shadow-grace-up"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-lg">
          {baseNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={item.label}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-0.5 py-1 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} size={22} />
                  <span className="mt-0.5 w-full truncate text-center text-[10px] font-semibold uppercase leading-tight tracking-wide">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
