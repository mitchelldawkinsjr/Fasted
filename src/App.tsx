import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { ThemeProvider } from './components/ThemeProvider';
import { CalendarPage } from './pages/CalendarPage';
import { JournalPage } from './pages/JournalPage';
import { PhasesPage } from './pages/PhasesPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodayPage } from './pages/TodayPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="phases" element={<PhasesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}
