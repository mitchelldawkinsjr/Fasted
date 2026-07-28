import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorFallback } from './components/ErrorFallback';
import { initAnalytics } from './lib/analytics';
import { applyDevSeedIfRequested } from './lib/seedData';
import { initAuthSync } from './lib/sync';
import { getProgress } from './lib/storage';
import { applyTheme } from './lib/theme';
import { initSentry, Sentry } from './lib/telemetry';
import './styles/globals.css';

initSentry();
initAnalytics();
applyDevSeedIfRequested();
initAuthSync();
applyTheme(getProgress().settings.theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
