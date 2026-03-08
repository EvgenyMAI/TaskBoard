import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import {
  getTask,
  updateTask,
  deleteTask,
  getComments,
  addComment,
  deleteComment,
  getAttachments,
  addAttachment,
  deleteAttachment,
  getTaskHistory,
  getProjects,
  getUsers,
} from '../api';

const STATUS_LABELS = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  REVIEW: 'На проверке',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

function formatDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString('ru-RU');
  } catch {
    return String(s);
  }
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [task, setTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('OPEN');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachName, setAttachName] = useState('');
  const [attachLoading, setAttachLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // comments | attachments | history

  const loadTask = () => {
    getTask(id)
      .then((t) => {
        setTask(t);
        setEditTitle(t.title);
        setEditDescription(t.description || '');
        setEditStatus(t.status || 'OPEN');
        setEditAssigneeId(t.assigneeId ? String(t.assigneeId) : '');
        setEditDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : '');
      })
      .catch((e) => setError(e.message));
  };

  const loadComments = () => {
    getComments(id).then(setComments).catch(() => {});
  };
  const loadAttachments = () => {
    getAttachments(id).then(setAttachments).catch(() => {});
  };
  const loadHistory = () => {
    getTaskHistory(id).then(setHistory).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    getTask(id)
      .then((t) => {
        setTask(t);
        setEditTitle(t.title);
        setEditDescription(t.description || '');
        setEditStatus(t.status || 'OPEN');
        setEditAssigneeId(t.assigneeId ? String(t.assigneeId) : '');
        setEditDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : '');
        return Promise.all([
          getComments(id),
          getAttachments(id),
          getTaskHistory(id),
          getProjects(),
          getUsers(),
        ]);
      })
      .then(([com, att, hist, proj, usr]) => {
        setComments(com || []);
        setAttachments(att || []);
        setHistory(hist || []);
        setProjects(proj || []);
        setUsers(usr || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const projectName = (pid) => projects.find((p) => p.id === pid)?.name || `#${pid}`;
  const userName = (uid) => users.find((u) => u.id === uid)?.username || `#${uid}`;

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const updated = await updateTask(id, {
        projectId: task.projectId,
        title: editTitle,
        description: editDescription,
        status: editStatus,
        assigneeId: editAssigneeId ? Number(editAssigneeId) : undefined,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
      });
      setTask(updated);
      setEditing(false);
      toast.success('Задача обновлена');
      loadHistory();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteTask = () => {
    if (!window.confirm('Удалить эту задачу?')) return;
    setError('');
    deleteTask(id)
      .then(() => {
        toast.success('Задача удалена');
        navigate(task.projectId ? `/projects/${task.projectId}` : '/tasks', { replace: true });
      })
      .catch((e) => {
        setError(e.message);
        toast.error(e.message);
      });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);
    setError('');
    try {
      await addComment(id, newComment.trim());
      setNewComment('');
      toast.success('Комментарий добавлен');
      loadComments();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    if (!window.confirm('Удалить комментарий?')) return;
    deleteComment(id, commentId)
      .then(() => {
        toast.success('Комментарий удалён');
        loadComments();
      })
      .catch((e) => {
        setError(e.message);
        toast.error(e.message);
      });
  };

  const handleAddAttachment = async (e) => {
    e.preventDefault();
    if (!attachUrl.trim()) return;
    setAttachLoading(true);
    setError('');
    try {
      await addAttachment(id, attachUrl.trim(), attachName.trim() || attachUrl.trim());
      setAttachUrl('');
      setAttachName('');
      toast.success('Вложение добавлено');
      loadAttachments();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setAttachLoading(false);
    }
  };

  const handleDeleteAttachment = (attachmentId) => {
    if (!window.confirm('Удалить вложение?')) return;
    deleteAttachment(id, attachmentId)
      .then(() => {
        toast.success('Вложение удалено');
        loadAttachments();
      })
      .catch((e) => {
        setError(e.message);
        toast.error(e.message);
      });
  };

  if (loading && !task) {
    return (
      <Layout>
        <div className="container page-width">
          <p className="muted">Загрузка...</p>
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="container page-width">
          <p className="error">Задача не найдена.</p>
          <Link to="/tasks">← К списку задач</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container page-width">
        <div className="breadcrumb">
          <Link to="/tasks">Задачи</Link>
          {task.projectId && (
            <>
              <span className="sep">/</span>
              <Link to={`/projects/${task.projectId}`}>{projectName(task.projectId)}</Link>
            </>
          )}
          <span className="sep">/</span>
          <span>{task.title}</span>
        </div>

        <div className="card page-intro">
          <h1>{task.title}</h1>
          <p className="muted">Карточка задачи: редактирование, история, комментарии и вложения.</p>
        </div>

        <div className="page-header">
          <h2>Действия по задаче</h2>
          <div className="page-header-actions">
            {!editing ? (
              <>
                <button type="button" onClick={() => setEditing(true)}>
                  Редактировать
                </button>
                <button type="button" className="danger" onClick={handleDeleteTask}>
                  Удалить
                </button>
              </>
            ) : (
              <button type="button" className="secondary" onClick={() => setEditing(false)}>
                Отмена
              </button>
            )}
          </div>
        </div>
        {error && <p className="error">{error}</p>}

        {editing ? (
          <div className="card form-card">
            <h2>Редактировать задачу</h2>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Статус</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Исполнитель</label>
                  <select value={editAssigneeId} onChange={(e) => setEditAssigneeId(e.target.value)}>
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
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setEditing(false)}>
                  Отмена
                </button>
                <button type="submit" disabled={submitLoading}>
                  {submitLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card task-meta">
            <p><strong>Статус:</strong> <span className={`badge badge-${(task.status || '').toLowerCase()}`}>{STATUS_LABELS[task.status] || task.status}</span></p>
            {task.description && <p><strong>Описание:</strong><br />{task.description}</p>}
            {task.assigneeId && <p><strong>Исполнитель:</strong> {userName(task.assigneeId)}</p>}
            {task.dueDate && <p><strong>Срок:</strong> {formatDate(task.dueDate)}</p>}
            <p className="muted small">Создана: {formatDate(task.createdAt)} · Обновлена: {formatDate(task.updatedAt)}</p>
          </div>
        )}

        <div className="tabs">
          <button type="button" className={activeTab === 'comments' ? 'active' : ''} onClick={() => setActiveTab('comments')}>
            Комментарии ({comments.length})
          </button>
          <button type="button" className={activeTab === 'attachments' ? 'active' : ''} onClick={() => setActiveTab('attachments')}>
            Вложения ({attachments.length})
          </button>
          <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
            История
          </button>
        </div>

        {activeTab === 'comments' && (
          <div className="card">
            <h3>Добавить комментарий</h3>
            <form onSubmit={handleAddComment} className="form-inline">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Текст комментария..."
                rows={2}
                style={{ flex: 1, minWidth: 200 }}
              />
              <button type="submit" disabled={commentLoading || !newComment.trim()}>
                {commentLoading ? 'Отправка...' : 'Отправить'}
              </button>
            </form>
            <ul className="comment-list">
              {comments.length === 0 ? (
                <li className="muted">Нет комментариев.</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="comment-item">
                    <p className="comment-text">{c.text}</p>
                    <span className="muted small">{userName(c.authorId)} · {formatDate(c.createdAt)}</span>
                    <button type="button" className="secondary small danger" onClick={() => handleDeleteComment(c.id)}>
                      Удалить
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="card">
            <h3>Добавить вложение (URL)</h3>
            <p className="muted small">Укажите ссылку на файл. Загрузка файлов с устройства будет в следующей версии.</p>
            <form onSubmit={handleAddAttachment} className="form-row">
              <input
                type="url"
                value={attachUrl}
                onChange={(e) => setAttachUrl(e.target.value)}
                placeholder="https://..."
              />
              <input
                type="text"
                value={attachName}
                onChange={(e) => setAttachName(e.target.value)}
                placeholder="Название файла"
              />
              <button type="submit" disabled={attachLoading || !attachUrl.trim()}>
                {attachLoading ? 'Добавление...' : 'Добавить'}
              </button>
            </form>
            <ul className="attachment-list">
              {attachments.length === 0 ? (
                <li className="muted">Нет вложений.</li>
              ) : (
                attachments.map((a) => (
                  <li key={a.id} className="attachment-item">
                    <a href={a.filePathOrUrl} target="_blank" rel="noopener noreferrer">
                      {a.fileName || a.filePathOrUrl}
                    </a>
                    <button type="button" className="secondary small danger" onClick={() => handleDeleteAttachment(a.id)}>
                      Удалить
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <ul className="history-list">
              {history.length === 0 ? (
                <li className="muted">История изменений пуста.</li>
              ) : (
                history.map((h) => (
                  <li key={h.id} className="history-item">
                    <strong>{h.fieldName}</strong>: {String(h.oldValue || '—')} → {String(h.newValue || '—')}
                    <span className="muted small"> · {userName(h.changedBy)} · {formatDate(h.changedAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
