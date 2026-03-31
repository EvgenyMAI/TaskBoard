import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  getProject,
  getTasks,
  createTask,
  deleteProject,
  getUsers,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '../api';

const STATUS_LABELS = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  REVIEW: 'На проверке',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

function formatDueDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isAdminOrManager = Boolean(user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER'));
  const isExecutor = Boolean(user?.roles?.includes('EXECUTOR'));
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskStatus, setTaskStatus] = useState('OPEN');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [inviting, setInviting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState('');

  const loadProject = () => {
    getProject(id)
      .then(setProject)
      .catch((e) => setError(e.message));
  };

  const loadTasks = () => {
    const params = { projectId: id };
    if (filterStatus) params.status = filterStatus;
    if (filterAssigneeId) params.assigneeId = filterAssigneeId;
    getTasks(params)
      .then(setTasks)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    const initialParams = { projectId: id };
    if (filterStatus) initialParams.status = filterStatus;
    if (filterAssigneeId) initialParams.assigneeId = filterAssigneeId;
    Promise.all([getProject(id), getTasks(initialParams), getUsers(), getProjectMembers(id)])
      .then(([proj, taskList, userList, memberIds]) => {
        setProject(proj);
        setTasks(Array.isArray(taskList) ? taskList : []);
        setUsers(userList || []);
        setProjectMembers(Array.isArray(memberIds) ? memberIds : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, filterStatus, filterAssigneeId]);

  const refreshTasks = () => {
    loadTasks();
  };
  const userName = (uid) => users.find((u) => u.id === uid)?.username || `#${uid}`;

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      await createTask({
        projectId: Number(id),
        title: taskTitle,
        description: taskDescription || undefined,
        status: taskStatus,
        assigneeId: isExecutor ? user?.userId : (taskAssigneeId ? Number(taskAssigneeId) : undefined),
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      });
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssigneeId('');
      setTaskStatus('OPEN');
      setTaskDueDate('');
      setShowTaskForm(false);
      toast.success('Задача создана');
      refreshTasks();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const refreshMembers = async () => {
    setMembersLoading(true);
    try {
      const ids = await getProjectMembers(id);
      setProjectMembers(Array.isArray(ids) ? ids : []);
    } catch (_) {
      // ignore UI refresh errors
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberToAdd) return;
    setInviting(true);
    setError('');
    try {
      await addProjectMember(id, Number(memberToAdd));
      toast.success('Участник добавлен');
      setMemberToAdd('');
      await refreshMembers();
    } catch (e2) {
      toast.error(e2.message);
      setError(e2.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Удалить участника из проекта?')) return;
    setError('');
    try {
      await removeProjectMember(id, memberId);
      toast.success('Участник удалён');
      await refreshMembers();
    } catch (e) {
      toast.error(e.message);
      setError(e.message);
    }
  };

  const handleDeleteProject = () => {
    if (!window.confirm(`Удалить проект «${project?.name}» и все задачи?`)) return;
    setError('');
    deleteProject(id)
      .then(() => {
        toast.success('Проект удалён');
        navigate('/projects');
      })
      .catch((e) => {
        setError(e.message);
        toast.error(e.message);
      });
  };

  if (loading && !project) {
    return (
      <Layout>
        <div className="container page-width">
          <p className="muted">Загрузка...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container page-width">
          <p className="error">Проект не найден.</p>
          <Link to="/projects">← К списку проектов</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container page-width">
        <div className="breadcrumb">
          <Link to="/projects">Проекты</Link>
          <span className="sep">/</span>
          <span>{project.name}</span>
        </div>
        <div className="card page-intro">
          <div>
            <h1>{project.name}</h1>
            {project.description && <p className="muted">{project.description}</p>}
          </div>
        </div>
        <div className="page-header">
          <h2>Управление проектом</h2>
          <div className="page-header-actions">
            <button type="button" onClick={() => setShowTaskForm(!showTaskForm)}>
              {showTaskForm ? 'Отмена' : '+ Новая задача'}
            </button>
            {isAdminOrManager && (
              <button type="button" className="danger" onClick={handleDeleteProject}>
                Удалить проект
              </button>
            )}
          </div>
        </div>
        {error && <p className="error">{error}</p>}

        {isAdminOrManager && (
          <div className="card">
            <h2>Участники проекта</h2>
            {membersLoading ? (
              <p className="muted small">Загрузка...</p>
            ) : (
              <>
                <ul className="card-list">
                  {(projectMembers || []).map((uid) => {
                    const u = users.find((x) => x.id === uid);
                    const isOwner = project?.createdBy === uid;
                    return (
                      <li key={uid} className="card card-list-item">
                        <div className="card-list-item-main">
                          <strong>{u?.username || `#${uid}`}</strong>
                          {isOwner && <span className="muted small"> (владелец)</span>}
                        </div>
                        {!isOwner && (
                          <button
                            type="button"
                            className="danger small"
                            onClick={() => handleRemoveMember(uid)}
                          >
                            Удалить
                          </button>
                        )}
                      </li>
                    );
                  })}
                  {(projectMembers || []).length === 0 && (
                    <li className="muted">Пока нет участников.</li>
                  )}
                </ul>

                <form onSubmit={handleAddMember} className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Добавить участника</label>
                  <select value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)}>
                    <option value="">— выбрать —</option>
                    {users
                      .filter((u) => !(projectMembers || []).includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                  </select>
                  <div className="form-actions">
                    <button type="submit" disabled={inviting || !memberToAdd}>
                      {inviting ? 'Добавление...' : 'Добавить'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {showTaskForm && (
          <div className="card form-card">
            <h2>Новая задача</h2>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  placeholder="Название задачи"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={2}
                  placeholder="Описание (необязательно)"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Статус</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Исполнитель</label>
                  {isExecutor ? (
                    <select value={user?.userId || ''} disabled>
                      <option value={user?.userId}>{user?.username || `#${user?.userId}`}</option>
                    </select>
                  ) : (
                    <select
                      value={taskAssigneeId}
                      onChange={(e) => setTaskAssigneeId(e.target.value)}
                    >
                      <option value="">— не назначен —</option>
                      {(projectMembers || [])
                        .map((uid) => users.find((u) => u.id === uid))
                        .filter(Boolean)
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Срок</label>
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setShowTaskForm(false)}>
                  Отмена
                </button>
                <button type="submit" disabled={submitLoading}>
                  {submitLoading ? 'Создание...' : 'Создать задачу'}
                </button>
              </div>
            </form>
          </div>
        )}

        <h2 className="section-title">Задачи ({tasks.length})</h2>
        <div className="filters card">
          <div className="form-row">
            <div className="form-group">
              <label>Статус</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Любой</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Исполнитель</label>
              <select value={filterAssigneeId} onChange={(e) => setFilterAssigneeId(e.target.value)}>
                <option value="">Все</option>
                {(projectMembers || [])
                  .map((uid) => users.find((u) => u.id === uid))
                  .filter(Boolean)
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
              </select>
            </div>
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="card">
            <p className="muted">Нет задач. Создайте первую задачу.</p>
          </div>
        ) : (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id} className="card task-list-item">
                <div className="task-item-content">
                  <div className="task-item-header">
                    <Link to={`/tasks/${t.id}`} className="task-title">
                      {t.title}
                    </Link>
                    <span className={`badge badge-${(t.status || '').toLowerCase()}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>
                  <div className="task-item-meta">
                    <span className="meta-chip">Исполнитель: {t.assigneeId ? userName(t.assigneeId) : '—'}</span>
                    <span className="meta-chip">Срок: {formatDueDate(t.dueDate)}</span>
                  </div>
                </div>
                <Link to={`/tasks/${t.id}`} className="btn-link">
                  Открыть →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
