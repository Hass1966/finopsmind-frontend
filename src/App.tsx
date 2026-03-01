import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';
import Anomalies from './pages/Anomalies';
import Recommendations from './pages/Recommendations';
import Forecasts from './pages/Forecasts';
import Providers from './pages/Providers';
import Remediations from './pages/Remediations';
import Policies from './pages/Policies';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <Navigate to="/" /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/forecasts" element={<Forecasts />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/remediations" element={<Remediations />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
