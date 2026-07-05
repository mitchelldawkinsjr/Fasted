import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAnalytics } from './lib/analytics';
import { applyDevSeedIfRequested } from './lib/seedData';
import { initAuthSync } from './lib/sync';
import { getProgress } from './lib/storage';
import { applyTheme } from './lib/theme';
import './styles/globals.css';

applyDevSeedIfRequested();
initAnalytics();
initAuthSync();
applyTheme(getProgress().settings.theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
