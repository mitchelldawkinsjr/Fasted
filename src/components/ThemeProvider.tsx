import { useEffect } from 'react';
import { useProgress } from '../hooks/useProgress';
import { applyTheme, watchSystemTheme } from '../lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const progress = useProgress();

  useEffect(() => {
    applyTheme(progress.settings.theme);
  }, [progress.settings.theme]);

  useEffect(() => {
    if (progress.settings.theme !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [progress.settings.theme]);

  return children;
}
