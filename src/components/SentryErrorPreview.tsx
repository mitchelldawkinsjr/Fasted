/** E2E-only helper to trigger ErrorBoundary for screenshot capture. */
export function SentryErrorPreview() {
  if (import.meta.env.VITE_E2E !== 'true') return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') !== 'error-boundary') return null;

  throw new Error('Error boundary screenshot preview');
}
