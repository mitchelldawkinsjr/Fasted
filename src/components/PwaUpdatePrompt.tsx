import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { dismissToast, getToasts, subscribeToasts, toast } from '../lib/toast';
import { openWhatsNewModal } from '../lib/whatsNew';

export function PwaUpdatePrompt() {
  const [activeToastId, setActiveToastId] = useState<string | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

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
    if (!needRefresh || activeToastId) return;

    const id = toast.persistent({
      title: 'Update available',
      message: 'A new version of Fasted is ready. See what’s new, then refresh.',
      type: 'info',
      position: 'top',
      actions: [
        {
          label: "What's new",
          variant: 'secondary',
          onClick: () => {
            openWhatsNewModal();
          },
        },
        {
          label: 'Refresh',
          variant: 'primary',
          onClick: async () => {
            dismissToast(id);
            setActiveToastId(null);
            await updateServiceWorker(true);
          },
        },
      ],
    });
    setActiveToastId(id);
  }, [needRefresh, activeToastId, updateServiceWorker]);

  return null;
}
