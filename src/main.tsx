import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAuthSync } from './lib/sync';
import { getProgress } from './lib/storage';
import { applyTheme } from './lib/theme';
import './styles/globals.css';

initAuthSync();
applyTheme(getProgress().settings.theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
