type Props = {
  resetError: () => void;
};

export function ErrorFallback({ resetError }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-gutter">
      <div className="stitch-card max-w-md space-y-stack-md p-stack-lg text-center">
        <h1 className="font-display text-headline-md text-primary">Something went wrong</h1>
        <p className="text-body-md text-on-surface-variant">
          An unexpected error occurred. You can try again or reload the app.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={resetError} className="btn-stitch-primary">
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-stitch-secondary"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
