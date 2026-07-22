import * as Sentry from '@sentry/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { SentryErrorFallback } from './components/SentryErrorFallback';
import { ThemeProvider } from './components/ThemeProvider';
import { TourProvider } from './components/Tour/TourContext';
import { CalendarPage } from './pages/CalendarPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { GroupsHubPage } from './pages/GroupsHubPage';
import { JoinGroupPage } from './pages/JoinGroupPage';
import { JournalPage } from './pages/JournalPage';
import { JournalPrintPage } from './pages/JournalPrintPage';
import { LeaderDashboardPage } from './pages/LeaderDashboardPage';
import { PhasesPage } from './pages/PhasesPage';
import { BadgeGalleryPage } from './pages/BadgeGalleryPage';
import { MilestoneDetailPage } from './pages/MilestoneDetailPage';
import { MoodVisualizerPage } from './pages/MoodVisualizerPage';
import { ProgressPage } from './pages/ProgressPage';
import { DataDeletionPage } from './pages/DataDeletionPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodayPage } from './pages/TodayPage';

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <SentryErrorFallback resetError={resetError} />}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <TourProvider>
              <ScrollToTop />
              <Routes>
            <Route path="journal/print" element={<JournalPrintPage />} />
            <Route element={<Layout />}>
              <Route index element={<TodayPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="journal" element={<JournalPage />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="progress/badges" element={<BadgeGalleryPage />} />
              <Route path="progress/milestones/:milestoneId" element={<MilestoneDetailPage />} />
              <Route path="progress/mood" element={<MoodVisualizerPage />} />
              <Route path="phases" element={<PhasesPage />} />
              <Route path="groups" element={<GroupsHubPage />} />
              <Route path="groups/:id" element={<GroupDetailPage />} />
              <Route path="groups/:id/dashboard" element={<LeaderDashboardPage />} />
              <Route path="join/:code" element={<JoinGroupPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="data-deletion" element={<DataDeletionPage />} />
            </Route>
            </Routes>
            </TourProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
