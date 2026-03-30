import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import {
  getTasks,
  getProjects,
  getUsers,
  createTask,
  getProjectMembers,
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

export default function TasksPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isExecutor = user?.roles?.includes('EXECUTOR');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [membersForProject, setMembersForProject] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState('');
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
    setFilterAssigneeId('');
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
      <div className="container page-width">
        <div className="card page-intro">
          <h1>Задачи</h1>
          <p className="muted">Фильтруйте, отслеживайте статусы и быстро переходите в карточки задач.</p>
        </div>
        <div className="page-header">
          <h2>Список задач</h2>
          <button type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Отмена' : '+ Создать задачу'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <div className="filters card">
          <div className="form-row">
            <div className="form-group">
              <label>Проект</label>
              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
              >
                <option value="">Все проекты</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Статус</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Любой</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {!isExecutor && (
              <div className="form-group">
                <label>Исполнитель</label>
                <select
                  value={filterAssigneeId}
                  onChange={(e) => setFilterAssigneeId(e.target.value)}
                >
                  <option value="">Все</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {showCreate && (
          <div className="card form-card">
            <h2>Новая задача</h2>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Проект *</label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, projectId: true }))}
                  className={touched.projectId && projectError ? 'input-invalid' : ''}
                  required
                >
                  <option value="">— выберите проект —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {touched.projectId && projectError && <p className="field-error">{projectError}</p>}
              </div>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                  className={touched.title && titleError ? 'input-invalid' : ''}
                  required
                />
                {touched.title && titleError && <p className="field-error">{titleError}</p>}
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Статус</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Исполнитель</label>
                  {isExecutor ? (
                    <select value={formAssigneeId} disabled>
                      <option value={user?.userId}>
                        {user?.username || `#${user?.userId}`}
                      </option>
                    </select>
                  ) : (
                    <select value={formAssigneeId} onChange={(e) => setFormAssigneeId(e.target.value)}>
                      <option value="">— не назначен —</option>
                      {membersForProject
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
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setShowCreate(false)}>
                  Отмена
                </button>
                <button type="submit" disabled={submitLoading || Boolean(projectError || titleError)}>
                  {submitLoading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <ul className="task-list">
            <li className="card"><Skeleton style={{ height: 62 }} /></li>
            <li className="card"><Skeleton style={{ height: 62 }} /></li>
            <li className="card"><Skeleton style={{ height: 62 }} /></li>
          </ul>
        ) : tasks.length === 0 ? (
          <div className="card">
            <p className="muted">Нет задач по выбранным фильтрам.</p>
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
                    <span className="meta-chip">Проект: {t.projectId ? projectById(t.projectId) : '—'}</span>
                    <span className="meta-chip">Исполнитель: {t.assigneeId ? userById(t.assigneeId) : '—'}</span>
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
