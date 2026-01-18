import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/auth-context';
import { Toaster } from './components/ui/toaster';
import { AppLayout } from './components/layout/app-layout';

// Pages
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { ProjectsPage } from './pages/projects';
import { ProjectDetailPage } from './pages/project-detail';
import { NewProjectPage } from './pages/new-project';
import { SettingsPage } from './pages/settings';
import { TeamPage } from './pages/team';
import { ConnectionsPage } from './pages/connections';
import { AdminOrganizationsPage } from './pages/admin/organizations';
import { NewSourcePage } from './pages/new-source';
import { ProjectConfigPage } from './pages/project-config';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<NewProjectPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/sources/new" element={<NewSourcePage />} />
              <Route path="/projects/:id/config" element={<ProjectConfigPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
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
  );
}

export default App;
