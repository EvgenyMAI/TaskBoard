import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  getTask,
  updateTask,
  deleteTask,
  getComments,
  addComment,
  deleteComment,
  getAttachments,
  uploadAttachmentFile,
  getAttachmentBlob,
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
  const { user } = useAuth();
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
  const [attachFile, setAttachFile] = useState(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachmentThumbs, setAttachmentThumbs] = useState({});
  const [viewer, setViewer] = useState({ open: false, url: '', name: '', mime: '', mode: 'file', text: '' });
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
  const currentUserId = user?.userId;
  const isAdminOrManager = Boolean(user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER'));
  const canEditTask = Boolean(task && (isAdminOrManager || task.assigneeId === currentUserId));
  const canDeleteTask = Boolean(task && (isAdminOrManager || task.assigneeId === currentUserId || task.createdBy === currentUserId));
  const canUploadAttachment = Boolean(task && (isAdminOrManager || task.assigneeId === currentUserId || task.createdBy === currentUserId));

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

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!attachFile) return;
    setAttachLoading(true);
    setError('');
    try {
      await uploadAttachmentFile(id, attachFile);
      setAttachFile(null);
      toast.success('Файл успешно загружен');
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

  const isImage = (mime) => Boolean(mime && mime.toLowerCase().startsWith('image/'));
  const isTextPreviewable = (mime = '') => {
    const m = String(mime).toLowerCase();
    return m.startsWith('text/') || ['application/json', 'application/xml', 'application/csv'].includes(m);
  };
  const isPreviewable = (mime = '') => {
    const m = String(mime).toLowerCase();
    return m.startsWith('image/') || isTextPreviewable(m);
  };
  const fileType = (name = '', mime = '') => {
    const lower = String(name).toLowerCase();
    if (isImage(mime)) return 'image';
    if (mime.includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
    if (mime.includes('word') || lower.endsWith('.doc') || lower.endsWith('.docx')) return 'doc';
    if (mime.includes('excel') || lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'sheet';
    if (mime.includes('presentation') || lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'slides';
    if (mime.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) return 'text';
    if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) return 'archive';
    return 'file';
  };
  const formatBytes = (size) => {
    if (!size || size < 0) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    let cancelled = false;
    const revokeUrls = [];
    const imageAttachments = attachments.filter((a) => isImage(a.mimeType));
    if (!imageAttachments.length) {
      setAttachmentThumbs({});
      return undefined;
    }

    (async () => {
      const next = {};
      for (const a of imageAttachments) {
        try {
          const { blob } = await getAttachmentBlob(id, a.id, { preview: true });
          if (cancelled) continue;
          const url = URL.createObjectURL(blob);
          revokeUrls.push(url);
          next[a.id] = url;
        } catch {
          // Skip broken previews, keep attachments list usable.
        }
      }
      if (!cancelled) setAttachmentThumbs(next);
    })();

    return () => {
      cancelled = true;
      revokeUrls.forEach((u) => URL.revokeObjectURL(u));
      setAttachmentThumbs({});
    };
  }, [attachments, id]);

  useEffect(() => () => {
    if (viewer.url) URL.revokeObjectURL(viewer.url);
  }, [viewer.url]);

  const displayName = (a) => {
    const n = (a?.fileName || '').trim();
    const m = (a?.mimeType || '').trim();
    if (!n) return 'Вложение';
    // If backend/client accidentally wrote MIME as file name, hide the noise.
    if (n.includes('/') && !n.includes('.') && n === m) return 'Вложение';
    return n;
  };

  const handleOpenAttachment = async (a) => {
    if (!isPreviewable(a.mimeType)) {
      toast.info('Для этого типа файла доступно только скачивание');
      return;
    }
    try {
      const { blob } = await getAttachmentBlob(id, a.id, { preview: true });
      const objectUrl = URL.createObjectURL(blob);
      const mime = (a.mimeType || '').toLowerCase();
      if (isTextPreviewable(mime)) {
        const text = await blob.text();
        setViewer((prev) => {
          if (prev.url) URL.revokeObjectURL(prev.url);
          return { open: true, url: '', name: displayName(a), mime: mime || 'text/plain', mode: 'text', text };
        });
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setViewer((prev) => {
        if (prev.url) URL.revokeObjectURL(prev.url);
        return {
          open: true,
          url: objectUrl,
          name: displayName(a),
          mime: a.mimeType || '',
          mode: 'image',
          text: '',
        };
      });
    } catch (e) {
      toast.error(e.message || 'Не удалось открыть файл');
    }
  };

  const handleDownloadAttachment = async (a) => {
    try {
      const { blob } = await getAttachmentBlob(id, a.id, { preview: false });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = displayName(a);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast.error(e.message || 'Не удалось скачать файл');
    }
  };

  const FileTypeIcon = ({ type }) => {
    const colors = {
      image: '#8b5cf6',
      pdf: '#ef4444',
      doc: '#2563eb',
      sheet: '#16a34a',
      slides: '#ea580c',
      text: '#64748b',
      archive: '#7c3aed',
      file: '#0f766e',
    };
    const c = colors[type] || colors.file;
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginRight: 6, verticalAlign: 'text-bottom' }}>
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke={c} strokeWidth="1.8" />
        <path d="M14 3v5h5" stroke={c} strokeWidth="1.8" />
        <rect x="8" y="12" width="8" height="1.8" rx="0.9" fill={c} />
        <rect x="8" y="16" width="6" height="1.8" rx="0.9" fill={c} />
      </svg>
    );
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
                {canEditTask && (
                  <button type="button" onClick={() => setEditing(true)}>
                    Редактировать
                  </button>
                )}
                {canDeleteTask && (
                  <button type="button" className="danger" onClick={handleDeleteTask}>
                    Удалить
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="secondary" onClick={() => setEditing(false)}>
                Отмена
              </button>
            )}
          </div>
        </div>
        {error && <p className="error">{error}</p>}

        {editing && canEditTask ? (
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
                    {(isAdminOrManager || c.authorId === currentUserId) && (
                      <button type="button" className="secondary small danger" onClick={() => handleDeleteComment(c.id)}>
                        Удалить
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="card">
            <h3>Загрузить файл</h3>
            {canUploadAttachment ? (
              <>
                <p className="muted small">Поддерживаются изображения и документы. Максимальный размер: 25 МБ.</p>
                <form onSubmit={handleUploadAttachment} className="form-row">
                  <input
                    type="file"
                    onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
                  />
                  <button type="submit" disabled={attachLoading || !attachFile}>
                    {attachLoading ? 'Загрузка...' : 'Загрузить файл'}
                  </button>
                </form>
              </>
            ) : (
              <p className="muted small">У вас нет прав на загрузку вложений для этой задачи.</p>
            )}
            <ul className="attachment-list">
              {attachments.length === 0 ? (
                <li className="muted">Нет вложений.</li>
              ) : (
                attachments.map((a) => (
                  <li key={a.id} className="attachment-item">
                    <div>
                      <div>
                        <FileTypeIcon type={fileType(a.fileName, a.mimeType)} />
                        <strong>{displayName(a)}</strong>
                      </div>
                      <div className="muted small">
                        Тип: {a.mimeType || 'application/octet-stream'} · Размер: {formatBytes(a.fileSize)}
                      </div>
                      <div className="form-actions" style={{ marginTop: 8 }}>
                        {isPreviewable(a.mimeType) && (
                          <button type="button" className="secondary small" onClick={() => handleOpenAttachment(a)}>
                            Открыть
                          </button>
                        )}
                        <button type="button" className="secondary small" onClick={() => handleDownloadAttachment(a)}>
                          Скачать
                        </button>
                      </div>
                      {isImage(a.mimeType) && (
                        <div style={{ marginTop: 8 }}>
                          {attachmentThumbs[a.id] ? (
                            <img
                              src={attachmentThumbs[a.id]}
                              alt={a.fileName || 'preview'}
                              onClick={() => handleOpenAttachment(a)}
                              style={{ maxWidth: 280, maxHeight: 180, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'zoom-in' }}
                            />
                          ) : (
                            <span className="muted small">Превью загружается...</span>
                          )}
                        </div>
                      )}
                    </div>
                    {(isAdminOrManager || a.uploadedBy === currentUserId) && (
                      <button type="button" className="secondary small danger" onClick={() => handleDeleteAttachment(a.id)}>
                        Удалить
                      </button>
                    )}
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
      {viewer.open && (
        <Modal title={viewer.name} onClose={() => setViewer({ open: false, url: '', name: '', mime: '', mode: 'file', text: '' })} width="96vw">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {viewer.mode === 'image' ? (
              <img src={viewer.url} alt={viewer.name} style={{ maxWidth: '100%', maxHeight: '85vh' }} />
            ) : (
              <pre style={{ width: '100%', maxHeight: '85vh', overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {viewer.text}
              </pre>
            )}
          </div>
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="secondary" onClick={() => setViewer({ open: false, url: '', name: '', mime: '', mode: 'file', text: '' })}>
              Закрыть
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
