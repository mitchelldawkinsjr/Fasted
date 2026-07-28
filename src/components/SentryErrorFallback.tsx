type SentryErrorFallbackProps = {
  resetError: () => void;
};

export function SentryErrorFallback({ resetError }: SentryErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-linen px-6 text-center text-on-surface">
      <h1 className="font-display text-headline-md text-primary">Something went wrong</h1>
      <p className="max-w-sm font-body text-body-md text-on-surface-variant">
        An unexpected error occurred. You can try again or reload the page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn-stitch-primary" onClick={resetError}>
          Try again
        </button>
        <button type="button" className="btn-stitch-secondary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}
