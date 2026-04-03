import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  getTasks,
  getProjects,
  getUsers,
  createTask,
  getProjectMembers,
} from '../api';
import TasksPageHeader from '../components/tasks/TasksPageHeader';
import TasksFiltersSection from '../components/tasks/TasksFiltersSection';
import TasksCreateFormSection from '../components/tasks/TasksCreateFormSection';
import TasksListSection from '../components/tasks/TasksListSection';

export default function TasksPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : 'T';
  const isExecutor = user?.roles?.includes('EXECUTOR');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [membersForProject, setMembersForProject] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState(searchParams.get('projectId') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterAssigneeId, setFilterAssigneeId] = useState(searchParams.get('assigneeId') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [formProjectId, setFormProjectId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('OPEN');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const projectError = !formProjectId ? 'Выберите проект' : '';
  const titleError = formTitle.trim().length < 2 ? 'Минимум 2 символа' : '';

  const loadData = () => {
    setLoading(true);
    setError('');
    const params = {};
    if (filterProjectId) params.projectId = filterProjectId;
    if (filterStatus) params.status = filterStatus;
    if (filterAssigneeId) params.assigneeId = filterAssigneeId;
    getTasks(params)
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filterProjectId, filterStatus, filterAssigneeId]);

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
    getUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (isExecutor) return;
    if (!formProjectId) {
      setMembersForProject([]);
      setFormAssigneeId('');
      return;
    }
    const pid = Number(formProjectId);
    getProjectMembers(pid)
      .then((ids) => {
        const next = Array.isArray(ids) ? ids : [];
        setMembersForProject(next);
        // Если текущий выбранный исполнитель не является участником проекта — сбрасываем
        if (formAssigneeId && !next.includes(Number(formAssigneeId))) {
          setFormAssigneeId('');
        }
      })
      .catch(() => {
        setMembersForProject([]);
      });
  }, [formProjectId, isExecutor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isExecutor) return;
    setFormAssigneeId(String(user?.userId ?? ''));
  }, [isExecutor, user?.userId]);

  const projectById = (id) => projects.find((p) => p.id === id)?.name || `#${id}`;
  const userById = (id) => users.find((u) => u.id === id)?.username || `#${id}`;

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formProjectId) {
      setError('Выберите проект');
      return;
    }
    if (isExecutor && !user?.userId) {
      setError('Не удалось определить текущего пользователя');
      return;
    }
    setTouched({ projectId: true, title: true });
    if (projectError || titleError) return;
    setSubmitLoading(true);
    setError('');
    try {
      await createTask({
        projectId: Number(formProjectId),
        title: formTitle,
        description: formDescription || undefined,
        status: formStatus,
        assigneeId: isExecutor ? user.userId : (formAssigneeId ? Number(formAssigneeId) : undefined),
        dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined,
      });
      setFormTitle('');
      setFormDescription('');
      setFormAssigneeId('');
      setFormStatus('OPEN');
      setFormDueDate('');
      setShowCreate(false);
      toast.success('Задача создана');
      loadData();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container page-width tasks-page">
        <TasksPageHeader
          heroLetter={heroLetter}
          username={username}
          loading={loading}
          tasksCount={tasks.length}
          showCreate={showCreate}
          onToggleCreate={() => setShowCreate(!showCreate)}
        />

        {error && <p className="error tasks-global-error">{error}</p>}

        <TasksFiltersSection
          filterProjectId={filterProjectId}
          setFilterProjectId={setFilterProjectId}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterAssigneeId={filterAssigneeId}
          setFilterAssigneeId={setFilterAssigneeId}
          projects={projects}
          users={users}
        />

        <TasksCreateFormSection
          showCreate={showCreate}
          formProjectId={formProjectId}
          setFormProjectId={setFormProjectId}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formDescription={formDescription}
          setFormDescription={setFormDescription}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formAssigneeId={formAssigneeId}
          setFormAssigneeId={setFormAssigneeId}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          touched={touched}
          setTouched={setTouched}
          projectError={projectError}
          titleError={titleError}
          projects={projects}
          membersForProject={membersForProject}
          users={users}
          isExecutor={isExecutor}
          user={user}
          submitLoading={submitLoading}
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreate(false)}
        />

        <TasksListSection
          loading={loading}
          tasks={tasks}
          projectById={projectById}
          userById={userById}
        />
      </div>
    </Layout>
  );
}
