type AnalyticsParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

function isEnabled(): boolean {
  return !import.meta.env.DEV && Boolean(MEASUREMENT_ID) && typeof window.gtag === 'function';
}

/** Load GA4 gtag when a measurement ID is configured (production builds only). */
export function initAnalytics(): void {
  if (import.meta.env.DEV || !MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function trackPageView(path: string, title?: string): void {
  if (!isEnabled()) return;

  window.gtag!('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
  if (!isEnabled()) return;
  window.gtag!('event', eventName, params);
}
