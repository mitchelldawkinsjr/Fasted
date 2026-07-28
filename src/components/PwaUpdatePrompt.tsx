import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { getLatestReleaseNotes } from '../lib/releaseNotes';
import { dismissToast, getToasts, subscribeToasts, toast } from '../lib/toast';

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

    const { blurb } = getLatestReleaseNotes();
    const message = blurb.trim() || 'A new version of Fasted is ready.';

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
            await updateServiceWorker(true);
          },
        },
      ],
    });
    setActiveToastId(id);
  }, [needRefresh, activeToastId, updateServiceWorker]);

  return null;
}
