import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import {
  getProject,
  getTasks,
  createTask,
  deleteProject,
  getUsers,
} from '../api';

const STATUS_LABELS = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  REVIEW: 'На проверке',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskStatus, setTaskStatus] = useState('OPEN');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadProject = () => {
    getProject(id)
      .then(setProject)
      .catch((e) => setError(e.message));
  };

  const loadTasks = () => {
    getTasks({ projectId: id })
      .then(setTasks)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([getProject(id), getTasks({ projectId: id }), getUsers()])
      .then(([proj, taskList, userList]) => {
        setProject(proj);
        setTasks(Array.isArray(taskList) ? taskList : []);
        setUsers(userList || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshTasks = () => {
    loadTasks();
  };

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
        assigneeId: taskAssigneeId ? Number(taskAssigneeId) : undefined,
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
            <button type="button" className="danger" onClick={handleDeleteProject}>
              Удалить проект
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}

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
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                  >
                    <option value="">— не назначен —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
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
        {tasks.length === 0 ? (
          <div className="card">
            <p className="muted">Нет задач. Создайте первую задачу.</p>
          </div>
        ) : (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id} className="card task-list-item">
                <div className="task-list-item-main">
                  <Link to={`/tasks/${t.id}`} className="task-title">
                    {t.title}
                  </Link>
                  <span className={`badge badge-${(t.status || '').toLowerCase()}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  {t.assigneeId && (
                    <span className="muted small">Исполнитель ID: {t.assigneeId}</span>
                  )}
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
