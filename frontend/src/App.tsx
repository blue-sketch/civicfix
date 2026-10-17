import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Shell } from './components/layout/Shell';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MyComplaintsPage } from './pages/MyComplaintsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { OfficerManagementPage } from './pages/OfficerManagementPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

const ProtectedAppLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white text-xs font-semibold">
        Initializing Civic Fix Environment...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Shell>
      <Routes>
        {/* Shared issue views, scoped to each account by the API */}
        <Route path="/" element={<OverviewPage />} />
        <Route path="/overview" element={<Navigate to="/" replace />} />
        <Route path="/map" element={<LiveMapPage />} />

        {/* Citizen-Only Routes */}
        {user.role === 'CITIZEN' && (
          <>
            <Route path="/report" element={<ReportIssuePage />} />
            <Route path="/my-complaints" element={<MyComplaintsPage />} />
          </>
        )}

        {user.role === 'MUNICIPAL_OFFICER' && <Route path="/assignments" element={<AssignmentsPage />} />}
        {user.role === 'ADMIN' && (
          <>
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/officers" element={<OfficerManagementPage />} />
          </>
        )}

        {/* Explicit redirects for removed features */}
        <Route path="/feed" element={<Navigate to="/" replace />} />
        <Route path="/issues" element={<Navigate to="/" replace />} />
        <Route path="/settings" element={<Navigate to="/" replace />} />
        <Route path="/routes" element={<Navigate to="/" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
};

const LandingOrDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white text-xs font-semibold">Initializing Civic Fix Environment...</div>;
  }
  return user ? <ProtectedAppLayout /> : <LandingPage />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage mode="login" />} />
            <Route path="/register" element={<LoginPage mode="register" />} />
            <Route path="/*" element={<LandingOrDashboard />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
