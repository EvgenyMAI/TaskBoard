import { useAuth } from '../context/AuthContext';
import { getProjects, getTasks, getUnreadNotificationsCount } from '../api';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardSummarySection from '../components/dashboard/DashboardSummarySection';
import DashboardMoreSection from '../components/dashboard/DashboardMoreSection';
import DashboardRecentProjectsSection from '../components/dashboard/DashboardRecentProjectsSection';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : '•';
  const [projects, setProjects] = useState([]);
  const [tasksCount, setTasksCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProjects(),
      getTasks(),
      getUnreadNotificationsCount(),
    ])
      .then(([projectList, taskList, unread]) => {
        setProjects(projectList || []);
        setTasksCount(Array.isArray(taskList) ? taskList.length : 0);
        setUnreadCount(Number(unread || 0));
      })
      .catch(() => {
        const msg = 'Не удалось загрузить данные. Попробуйте обновить страницу чуть позже.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="container page-width dashboard-page">
        <DashboardHero username={username} heroLetter={heroLetter} />

        {error && <p className="error dashboard-global-error">{error}</p>}

        <DashboardSummarySection
          loading={loading}
          projectsCount={projects.length}
          tasksCount={tasksCount}
          unreadCount={unreadCount}
        />

        <DashboardMoreSection />

        <DashboardRecentProjectsSection loading={loading} projects={projects} />
      </div>
    </Layout>
  );
}
