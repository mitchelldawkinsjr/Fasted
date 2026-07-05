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

/** Strip invite codes and other sensitive path segments before sending to GA4. */
function sanitizeAnalyticsPath(path: string): string {
  return path.replace(/^\/join\/[^/?#]+/, '/join/:code');
}

export function trackPageView(path: string): void {
  if (!isEnabled()) return;

  const sanitizedPath = sanitizeAnalyticsPath(path);
  window.gtag!('event', 'page_view', {
    page_path: sanitizedPath,
    page_location: `${window.location.origin}${sanitizedPath}`,
    page_title: document.title,
  });
}

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
  if (!isEnabled()) return;
  window.gtag!('event', eventName, params);
}
