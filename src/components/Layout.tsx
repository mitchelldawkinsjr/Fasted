import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { Icon } from './Icon';
import { InstallPromptToast } from './InstallPromptToast';

const navItems = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar_month' },
  { to: '/journal', label: 'Journal', icon: 'menu_book' },
  { to: '/progress', label: 'Progress', icon: 'query_stats' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const pageTitles: Record<string, string> = {
  '/': 'Fasted Calendar',
  '/calendar': 'Fasted Calendar',
  '/journal': 'My Spiritual Journal',
  '/progress': 'Fasted Calendar',
  '/phases': 'Fasted Calendar',
  '/settings': 'Fasted Calendar',
};

export function Layout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'Fasted Calendar';

  return (
    <div className="relative mx-auto min-h-screen max-w-lg pb-28">
      <div className="pointer-events-none fixed inset-0 linen-texture" aria-hidden />
      <AppHeader title={title} showPhasesLink={pathname !== '/phases'} />

      <main className="relative z-10 px-container-margin pb-stack-lg pt-[72px]">
        <Outlet />
      </main>

      <InstallPromptToast />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl bg-surface-container-lowest px-4 pb-8 pt-2 shadow-grace-up"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-lg justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-full px-3 py-1 transition-all active:scale-90 ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} />
                  <span className="label-caps mt-0.5">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
