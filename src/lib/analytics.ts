const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isEnabled(): boolean {
  return Boolean(GA_ID) && !import.meta.env.DEV;
}

/** Strip invite codes and other sensitive path segments before sending to GA. */
export function sanitizeAnalyticsPath(path: string): string {
  const [pathname, search = ''] = path.split('?');
  const sanitizedPath = pathname.replace(/^\/join\/[^/]+/, '/join/:code');
  return search ? `${sanitizedPath}?${search}` : sanitizedPath;
}

export function initAnalytics(): void {
  if (!isEnabled()) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID!, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

export function trackPageView(path: string): void {
  if (!isEnabled() || !window.gtag) return;
  const page_path = sanitizeAnalyticsPath(path);
  window.gtag('event', 'page_view', { page_path });
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!isEnabled() || !window.gtag) return;
  window.gtag('event', name, params);
}
