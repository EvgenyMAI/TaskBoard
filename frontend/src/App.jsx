import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="container">Загрузка...</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
      <Route path="/tasks/:id" element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
