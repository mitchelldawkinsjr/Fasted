export type ConfirmVariant = 'default' | 'danger';

export type ConfirmRequest = {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: ConfirmVariant;
};

type ConfirmState = ConfirmRequest & {
  resolve: (confirmed: boolean) => void;
};

let pending: ConfirmState | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function createId(): string {
  return `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeConfirm(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingConfirm(): ConfirmRequest | null {
  return pending;
}

export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}): Promise<boolean> {
  return new Promise((resolve) => {
    pending = {
      id: createId(),
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      variant: options.variant ?? 'default',
      resolve,
    };
    notify();
  });
}

export function answerConfirm(confirmed: boolean): void {
  if (!pending) return;
  pending.resolve(confirmed);
  pending = null;
  notify();
}
