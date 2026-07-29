import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { dismissToast, getToasts, subscribeToasts, toast } from '../lib/toast';
import { openWhatsNewModal } from '../lib/whatsNew';

const DEFAULT_UPDATE_MESSAGE = 'A new version of Fasted is ready.';

export function PwaUpdatePrompt() {
  const [activeToastId, setActiveToastId] = useState<string | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });
  const updateServiceWorkerRef = useRef(updateServiceWorker);
  updateServiceWorkerRef.current = updateServiceWorker;
  const showingToastRef = useRef(false);

  useEffect(() => {
    return subscribeToasts(() => {
      setActiveToastId((current) => {
        if (current && !getToasts().some((t) => t.id === current)) {
          return null;
        }
        return current;
      });
    });
  }, []);

  useEffect(() => {
    if (!needRefresh) {
      showingToastRef.current = false;
      return;
    }
    if (activeToastId || showingToastRef.current) return;

    showingToastRef.current = true;

    void (async () => {
      let message = DEFAULT_UPDATE_MESSAGE;
      try {
        const response = await fetch('/releaseNotes.json', { cache: 'no-store' });
        if (response.ok) {
          const data = (await response.json()) as { blurb?: string };
          const blurb = data.blurb?.trim();
          if (blurb) message = blurb;
        }
      } catch {
        // Fall back to the default message when release notes are unavailable.
      }

      setActiveToastId((current) => {
        if (current) return current;

        const id = toast.persistent({
          title: 'Update available',
          message,
          type: 'info',
          position: 'bottom',
          actions: [
            {
              label: 'Refresh',
              variant: 'primary',
              onClick: async () => {
                dismissToast(id);
                setActiveToastId(null);
                await updateServiceWorkerRef.current(true);
              },
            },
          ],
        });
        return id;
      });
    })();
  }, [needRefresh, activeToastId]);

  return null;
}
