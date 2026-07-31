import { Link } from 'react-router-dom';
import { Icon } from '../Icon';

const ACTIONS = [
  { to: '/journal', label: 'Journal', icon: 'edit_note' as const },
  { to: '/journal?type=prayer', label: 'Prayer', icon: 'volunteer_activism' as const },
  { to: '/journal?type=daily-reflection', label: 'Scripture', icon: 'menu_book' as const },
  { to: '/groups', label: 'Groups', icon: 'groups' as const },
  { to: '/calendar', label: 'Calendar', icon: 'calendar_month' as const },
];

export function QuickActionsBar() {
  return (
    <nav aria-label="Quick actions" className="stitch-card p-stack-md" data-tour="quick-actions">
      <p className="mb-3 text-center label-caps text-on-surface-variant">Quick Actions</p>
      <div className="grid grid-cols-5 gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-xl bg-surface-container-high/50 px-1 py-2 text-center transition-colors hover:bg-surface-container-high active:scale-[0.98]"
          >
            <Icon name={action.icon} className="text-secondary" size={22} />
            <span className="text-[11px] font-medium leading-tight text-primary sm:text-body-sm">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
