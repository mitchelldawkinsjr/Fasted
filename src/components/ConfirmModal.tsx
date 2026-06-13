import { useEffect, useState } from 'react';
import { answerConfirm, getPendingConfirm, subscribeConfirm } from '../lib/confirm';
import { Icon } from './Icon';

export function ConfirmModal() {
  const [request, setRequest] = useState(getPendingConfirm);

  useEffect(() => subscribeConfirm(() => setRequest(getPendingConfirm())), []);

  if (!request) return null;

  const isDanger = request.variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="w-full max-w-md animate-fade-in-up rounded-xl bg-surface-container-lowest p-stack-lg shadow-grace">
        <div className="mb-stack-md flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDanger ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
            }`}
          >
            <Icon name={isDanger ? 'warning' : 'help'} filled />
          </div>
          <div>
            <h2 id="confirm-title" className="font-display text-headline-md text-primary">
              {request.title}
            </h2>
            <p id="confirm-message" className="mt-2 text-body-md text-on-surface-variant">
              {request.message}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => answerConfirm(false)}
            className="btn-stitch-secondary flex-1"
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => answerConfirm(true)}
            className={`flex-1 rounded-lg px-4 py-3 font-body text-body-md font-semibold transition-all active:scale-95 ${
              isDanger
                ? 'bg-error text-on-error hover:opacity-90'
                : 'btn-stitch-primary'
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
