import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/auth-context';
import { Toaster } from './components/ui/toaster';
import { AppLayout } from './components/layout/app-layout';
import { ErrorBoundary } from './components/error-boundary';

// Public pages
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { AcceptInvitationPage } from './pages/accept-invitation';

// Protected pages
import { DashboardPage } from './pages/dashboard';
import { ProjectsPage } from './pages/projects';
import { ProjectDetailPage } from './pages/project-detail';
import { NewProjectPage } from './pages/new-project';
import { ProjectConfigurePage } from './pages/project-configure';
import { ProjectPreviewPage } from './pages/project-preview';
import { RunDetailPage } from './pages/run-detail';
import { SettingsPage } from './pages/settings';
import { SettingsProfilePage } from './pages/settings-profile';
import { SettingsUsersPage } from './pages/settings-users';
import { TeamPage } from './pages/team';
import { ConnectionsPage } from './pages/connections';

// Admin pages
import { AdminDashboardPage } from './pages/admin/dashboard';
import { AdminOrganizationsPage } from './pages/admin/organizations';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/invite/:token" element={<AcceptInvitationPage />} />

              {/* Protected routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Project routes */}
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/new" element={<NewProjectPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/projects/:id/configure" element={<ProjectConfigurePage />} />
                <Route path="/projects/:id/preview" element={<ProjectPreviewPage />} />
                <Route path="/projects/:id/runs/:runId" element={<RunDetailPage />} />

                {/* Settings routes */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/profile" element={<SettingsProfilePage />} />
                <Route path="/settings/users" element={<SettingsUsersPage />} />

                {/* Team and connections */}
                <Route path="/team" element={<TeamPage />} />
                <Route path="/connections" element={<ConnectionsPage />} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
