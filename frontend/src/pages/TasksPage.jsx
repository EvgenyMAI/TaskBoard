import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { STATUS_LABELS } from '../constants/taskStatus';
import { formatDueDateShort } from '../utils/dateFormat';

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
        <header className="card profile-hero tasks-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-tasks" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1>Задачи</h1>
              <div className="profile-hero-line">
                <p className="profile-hero-sub">
                  {username ? `Все ваши задачи, ${username}` : 'Отфильтруйте по проекту, статусу или исполнителю'}
                </p>
                <div className="profile-role-chips" aria-live="polite">
                  <span className="profile-chip-metric">
                    {loading ? 'Загрузка…' : `Задач: ${tasks.length}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="profile-hero-hint profile-hero-hint-row">
            <p className="muted small profile-hero-hint-text">
              В карточке задачи — комментарии, файлы и история изменений.
            </p>
            <button type="button" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Отмена' : '+ Создать задачу'}
            </button>
          </div>
        </header>

        {error && <p className="error tasks-global-error">{error}</p>}

        <section className="card profile-section" aria-labelledby="tasks-filters-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="tasks-filters-heading">Фильтры</h2>
          </div>
          <div className="form-row tasks-filters-row">
            <div className="form-group">
              <label htmlFor="task-filter-project">Проект</label>
              <select
                id="task-filter-project"
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
              <label htmlFor="task-filter-status">Статус</label>
              <select
                id="task-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Любой</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="task-filter-assignee">Исполнитель</label>
              <select
                id="task-filter-assignee"
                value={filterAssigneeId}
                onChange={(e) => setFilterAssigneeId(e.target.value)}
              >
                <option value="">Все</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {showCreate && (
          <section className="card profile-section" aria-labelledby="tasks-new-heading">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="tasks-new-heading">Новая задача</h2>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label htmlFor="task-new-project">Проект *</label>
                <select
                  id="task-new-project"
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
                <label htmlFor="task-new-title">Название</label>
                <input
                  id="task-new-title"
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
                <label htmlFor="task-new-desc">Описание</label>
                <textarea
                  id="task-new-desc"
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
          </section>
        )}

        <section className="card profile-section" aria-labelledby="tasks-list-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="tasks-list-heading">Список задач</h2>
          </div>
          {loading ? (
            <ul className="task-list">
              <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
              <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
              <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
            </ul>
          ) : tasks.length === 0 ? (
            <p className="muted tasks-empty">Нет задач по выбранным фильтрам.</p>
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
                      <span className="meta-chip">Срок: {formatDueDateShort(t.dueDate)}</span>
                    </div>
                  </div>
                  <Link to={`/tasks/${t.id}`} className="btn-link">
                    Открыть →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}
