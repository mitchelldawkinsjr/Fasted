export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastAction = {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
  persistent?: boolean;
  position: 'top' | 'bottom';
  actions: ToastAction[];
};

type ToastInput = {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  persistent?: boolean;
  position?: 'top' | 'bottom';
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary';
    onClick: () => void;
  }>;
};

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6500,
  info: 4500,
  warning: 5000,
};

let toasts: Toast[] = [];
const actionHandlers = new Map<string, () => void>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function createId(): string {
  return crypto.randomUUID();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

export function runToastAction(toastId: string, actionId: string): void {
  actionHandlers.get(`${toastId}:${actionId}`)?.();
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  for (const key of [...actionHandlers.keys()]) {
    if (key.startsWith(`${id}:`)) actionHandlers.delete(key);
  }
  notify();
}

export function showToast(input: ToastInput): string {
  const type = input.type ?? 'info';
  const id = createId();
  const actions: ToastAction[] = (input.actions ?? []).map((action, index) => {
    const actionId = `action-${index}`;
    actionHandlers.set(`${id}:${actionId}`, action.onClick);
    return {
      id: actionId,
      label: action.label,
      variant: action.variant,
    };
  });

  const toast: Toast = {
    id,
    title: input.title,
    message: input.message,
    type,
    duration: input.persistent ? 0 : (input.duration ?? DEFAULT_DURATIONS[type]),
    persistent: input.persistent,
    position: input.position ?? 'top',
    actions,
  };

  toasts = [toast, ...toasts.filter((t) => !t.persistent)].slice(0, 5);
  notify();
  return id;
}

export const toast = {
  success(message: string, duration?: number) {
    return showToast({ message, type: 'success', duration });
  },
  error(message: string, duration?: number) {
    return showToast({ message, type: 'error', duration });
  },
  info(message: string, duration?: number) {
    return showToast({ message, type: 'info', duration });
  },
  warning(message: string, duration?: number) {
    return showToast({ message, type: 'warning', duration });
  },
  persistent(input: Omit<ToastInput, 'persistent'>) {
    return showToast({ ...input, persistent: true, duration: 0 });
  },
};
