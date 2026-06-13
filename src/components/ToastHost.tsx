import { useEffect, useState } from 'react';
import {
  dismissToast,
  getToasts,
  runToastAction,
  subscribeToasts,
  type Toast,
  type ToastType,
} from '../lib/toast';
import { Icon } from './Icon';

const TYPE_STYLES: Record<
  ToastType,
  { border: string; icon: string; iconClass: string; filled?: boolean }
> = {
  success: {
    border: 'border-secondary',
    icon: 'check_circle',
    iconClass: 'text-secondary',
    filled: true,
  },
  error: {
    border: 'border-error',
    icon: 'error',
    iconClass: 'text-error',
    filled: true,
  },
  info: {
    border: 'border-primary-container',
    icon: 'info',
    iconClass: 'text-primary',
  },
  warning: {
    border: 'border-tertiary-container',
    icon: 'warning',
    iconClass: 'text-tertiary-container',
    filled: true,
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const style = TYPE_STYLES[toast.type];

  useEffect(() => {
    if (toast.persistent || toast.duration <= 0) return;
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.duration, toast.id, toast.persistent]);

  return (
    <div
      className={`stitch-card pointer-events-auto border-l-4 p-3 shadow-grace-up ${style.border} animate-fade-in-up ${
        toast.title || toast.actions.length > 0 ? 'space-y-2' : 'flex items-start gap-3'
      }`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <Icon
          name={style.icon}
          className={`mt-0.5 shrink-0 ${style.iconClass}`}
          filled={style.filled}
        />
        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="font-display text-headline-md text-primary">{toast.title}</p>
          )}
          <p className={`text-body-md text-primary ${toast.title ? 'mt-1 text-on-surface-variant' : ''}`}>
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="shrink-0 text-outline transition hover:text-primary"
          aria-label="Dismiss notification"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {toast.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-9">
          {toast.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => runToastAction(toast.id, action.id)}
              className={
                action.variant === 'primary'
                  ? 'btn-stitch-primary !px-4 !py-2 text-body-md'
                  : 'btn-stitch-secondary !px-4 !py-2 text-body-md'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(getToasts);

  useEffect(() => subscribeToasts(() => setItems(getToasts())), []);

  const topToasts = items.filter((t) => t.position === 'top');
  const bottomToasts = items.filter((t) => t.position === 'bottom');

  return (
    <>
      {topToasts.length > 0 && (
        <div
          className="pointer-events-none fixed left-3 right-3 top-[calc(72px+0.5rem+env(safe-area-inset-top))] z-[70] mx-auto flex max-w-lg flex-col gap-2"
          aria-label="Notifications"
        >
          {topToasts.map((item) => (
            <ToastItem key={item.id} toast={item} />
          ))}
        </div>
      )}

      {bottomToasts.length > 0 && (
        <div
          className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-[55] mx-auto flex max-w-lg flex-col gap-2"
          aria-label="Persistent notifications"
        >
          {bottomToasts.map((item) => (
            <ToastItem key={item.id} toast={item} />
          ))}
        </div>
      )}
    </>
  );
}
