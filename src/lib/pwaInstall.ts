const DISMISS_KEY = 'fasted-calendar-install-toast-dismissed';

export function isRunningAsInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;

  const standaloneMq = window.matchMedia('(display-mode: standalone)').matches;
  const fullscreenMq = window.matchMedia('(display-mode: fullscreen)').matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return standaloneMq || fullscreenMq || iosStandalone;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

export function wasInstallToastDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallToast(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}
