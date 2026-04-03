import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
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
import { STATUS_LABELS } from '../constants/taskStatus';
import { formatDueDateShort } from '../utils/dateFormat';

const PROJECT_MEMBERS_PAGE_SIZE = 12;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
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
  const [membersPanelOpen, setMembersPanelOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);

  const heroLetter = (project?.name || 'P').trim().charAt(0).toUpperCase() || 'P';

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

  const memberRows = useMemo(() => {
    const ids = projectMembers || [];
    return ids.map((uid) => {
      const u = users.find((x) => x.id === uid);
      return { uid, user: u, isOwner: project?.createdBy === uid };
    });
  }, [projectMembers, users, project?.createdBy]);

  const filteredMemberRows = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return memberRows;
    return memberRows.filter(({ user: u, uid }) => {
      const un = (u?.username || '').toLowerCase();
      const em = (u?.email || '').toLowerCase();
      const idStr = String(uid);
      return un.includes(q) || em.includes(q) || idStr.includes(q);
    });
  }, [memberRows, memberSearch]);

  const memberTotalPages = Math.max(1, Math.ceil(filteredMemberRows.length / PROJECT_MEMBERS_PAGE_SIZE));

  useEffect(() => {
    setMemberPage(1);
  }, [memberSearch]);

  useEffect(() => {
    setMemberPage((p) => Math.min(p, memberTotalPages));
  }, [memberTotalPages]);

  const memberPageSafe = Math.min(memberPage, memberTotalPages);
  const paginatedMemberRows = useMemo(() => {
    const start = (memberPageSafe - 1) * PROJECT_MEMBERS_PAGE_SIZE;
    return filteredMemberRows.slice(start, start + PROJECT_MEMBERS_PAGE_SIZE);
  }, [filteredMemberRows, memberPageSafe]);

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
    const ok = await confirm({
      title: 'Удалить участника',
      message: 'Пользователь потеряет доступ к проекту и связанным задачам (задачи не удаляются).',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;
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

  const handleDeleteProject = async () => {
    const ok = await confirm({
      title: 'Удалить проект',
      message: `Проект «${project?.name}» и все его задачи будут удалены без возможности восстановления.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;
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
        <div className="container page-width project-detail-page">
          <div className="card profile-hero project-detail-hero">
            <Skeleton style={{ height: 88 }} />
          </div>
          <ul className="task-list project-detail-skeleton-list">
            <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
            <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
          </ul>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container page-width project-detail-page">
          <section className="card profile-section">
            <p className="error">Проект не найден.</p>
            <Link to="/projects">← К списку проектов</Link>
          </section>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container page-width project-detail-page">
        <nav className="breadcrumb task-breadcrumb project-breadcrumb" aria-label="Навигация">
          <Link to="/projects">Проекты</Link>
          <span className="sep">/</span>
          <span className="breadcrumb-current">{project.name}</span>
        </nav>

        <header className="card profile-hero project-detail-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-project-detail" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1 className="task-detail-title">{project.name}</h1>
              <div className="profile-hero-line">
                <p className="profile-hero-sub">
                  {project.description?.trim()
                    ? project.description
                    : 'Задачи и команда — всё в этом проекте'}
                </p>
                <div className="profile-role-chips" aria-live="polite">
                  <span className="profile-chip-metric">Задач: {tasks.length}</span>
                  {isAdminOrManager && (projectMembers || []).length > 0 && (
                    <span className="profile-chip-metric">
                      Участников: {(projectMembers || []).length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="profile-hero-hint profile-hero-hint-row">
            <p className="muted small profile-hero-hint-text">
              Задачи ниже; участников можно добавить в блоке «Участники проекта».
            </p>
            <div className="task-detail-hero-actions">
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
        </header>

        {error && <p className="error project-detail-global-error">{error}</p>}

        {isAdminOrManager && (
          <section className={`card profile-section profile-admin-card project-members-card ${membersPanelOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="profile-admin-toggle"
              aria-expanded={membersPanelOpen}
              aria-controls="project-members-panel"
              id="project-members-heading"
              onClick={() => setMembersPanelOpen((v) => !v)}
            >
              <span className="profile-section-head profile-admin-toggle-inner">
                <span className="profile-section-icon" aria-hidden="true">◆</span>
                <span className="profile-admin-toggle-text">
                  <span className="profile-admin-toggle-title">Участники проекта</span>
                  <span className="muted small profile-admin-toggle-desc">
                    Список, поиск и приглашение — после раскрытия.
                  </span>
                </span>
              </span>
              <span className={`profile-chevron ${membersPanelOpen ? 'open' : ''}`} aria-hidden="true" />
            </button>

            {membersPanelOpen && (
              <div
                id="project-members-panel"
                role="region"
                aria-labelledby="project-members-heading"
                className="profile-admin-panel"
              >
                {membersLoading ? (
                  <Skeleton style={{ height: 160 }} />
                ) : (
                  <>
                    <div className="profile-admin-toolbar">
                      <label className="profile-admin-search-label">
                        <span className="sr-only">Поиск участника</span>
                        <input
                          type="search"
                          className="profile-admin-search"
                          placeholder="Поиск по имени, почте или id…"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary small"
                        onClick={() => refreshMembers()}
                        disabled={membersLoading}
                      >
                        Обновить список
                      </button>
                    </div>
                    <p className="muted small profile-admin-meta">
                      В проекте: <strong>{memberRows.length}</strong>
                      {memberSearch.trim() ? (
                        <> · по запросу: <strong>{filteredMemberRows.length}</strong></>
                      ) : null}
                    </p>

                    {filteredMemberRows.length === 0 ? (
                      <p className="muted profile-admin-empty">
                        {memberRows.length === 0
                          ? 'Пока нет участников. Добавьте пользователя ниже.'
                          : 'Никто не подходит под фильтр. Измените поисковый запрос.'}
                      </p>
                    ) : (
                      <>
                        <div className="role-management project-members-list">
                          {paginatedMemberRows.map(({ uid, user: u, isOwner }) => (
                            <div key={uid} className="role-row project-member-row">
                              <div className="role-row-user">
                                <strong>{u?.username || `#${uid}`}</strong>
                                {isOwner && <span className="muted small"> (владелец)</span>}
                                {u?.email ? (
                                  <div className="muted small role-row-email">{u.email}</div>
                                ) : null}
                              </div>
                              {!isOwner ? (
                                <button
                                  type="button"
                                  className="danger small"
                                  onClick={() => handleRemoveMember(uid)}
                                >
                                  Удалить
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {memberTotalPages > 1 && (
                          <div className="profile-admin-pagination">
                            <button
                              type="button"
                              className="secondary small"
                              disabled={memberPageSafe <= 1}
                              onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                            >
                              Назад
                            </button>
                            <span className="muted small profile-admin-page-info">
                              Стр. {memberPageSafe} из {memberTotalPages}
                              {' · '}
                              {(memberPageSafe - 1) * PROJECT_MEMBERS_PAGE_SIZE + 1}
                              –
                              {Math.min(memberPageSafe * PROJECT_MEMBERS_PAGE_SIZE, filteredMemberRows.length)}
                              {' '}
                              из {filteredMemberRows.length}
                            </span>
                            <button
                              type="button"
                              className="secondary small"
                              disabled={memberPageSafe >= memberTotalPages}
                              onClick={() => setMemberPage((p) => Math.min(memberTotalPages, p + 1))}
                            >
                              Вперёд
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <form onSubmit={handleAddMember} className="project-members-invite">
                      <div className="form-group">
                        <label htmlFor="project-add-member">Добавить участника</label>
                        <select
                          id="project-add-member"
                          value={memberToAdd}
                          onChange={(e) => setMemberToAdd(e.target.value)}
                        >
                          <option value="">— выбрать пользователя —</option>
                          {users
                            .filter((u) => !(projectMembers || []).includes(u.id))
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username}{u.email ? ` (${u.email})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={inviting || !memberToAdd}>
                          {inviting ? 'Добавление...' : 'Добавить в проект'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {showTaskForm && (
          <section className="card profile-section" aria-labelledby="project-new-task-heading">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="project-new-task-heading">Новая задача</h2>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label htmlFor="project-task-title">Название</label>
                <input
                  id="project-task-title"
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  placeholder="Название задачи"
                />
              </div>
              <div className="form-group">
                <label htmlFor="project-task-desc">Описание</label>
                <textarea
                  id="project-task-desc"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={2}
                  placeholder="Описание (необязательно)"
                />
              </div>
              <div className="form-row tasks-filters-row">
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
          </section>
        )}

        <section className="card profile-section" aria-labelledby="project-task-filters-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="project-task-filters-heading">Фильтры списка задач</h2>
          </div>
          <div className="form-row tasks-filters-row">
            <div className="form-group">
              <label htmlFor="project-filter-status">Статус</label>
              <select
                id="project-filter-status"
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
              <label htmlFor="project-filter-assignee">Исполнитель</label>
              <select
                id="project-filter-assignee"
                value={filterAssigneeId}
                onChange={(e) => setFilterAssigneeId(e.target.value)}
              >
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
        </section>

        <section className="card profile-section" aria-labelledby="project-tasks-list-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="project-tasks-list-heading">Задачи проекта ({tasks.length})</h2>
          </div>
          {tasks.length === 0 ? (
            <p className="muted tasks-empty">Нет задач по выбранным фильтрам. Создайте первую задачу.</p>
          ) : (
            <ul className="task-list project-detail-task-list">
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
