import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { dismissToast, toast } from '../lib/toast';

let updateToastId: string | null = null;

function dismissUpdatePrompt() {
  if (updateToastId) {
    dismissToast(updateToastId);
    updateToastId = null;
  }
}

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

  useEffect(() => {
    if (!needRefresh || updateToastId) return;

    updateToastId = toast.persistent({
      title: 'Update available',
      message: 'A new version of Fasted Calendar is ready.',
      type: 'info',
      position: 'top',
      actions: [
        {
          label: 'Refresh',
          variant: 'primary',
          onClick: async () => {
            dismissUpdatePrompt();
            await updateServiceWorker(true);
          },
        },
      ],
    });
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    if (needRefresh) return;
    dismissUpdatePrompt();
  }, [needRefresh]);

  return null;
}
