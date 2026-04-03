import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
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
  getProjectMembers,
} from '../api';

const STATUS_LABELS = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  REVIEW: 'На проверке',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

const HISTORY_FIELD_LABELS = {
  title: 'Название',
  description: 'Описание',
  status: 'Статус',
  assigneeId: 'Исполнитель',
  dueDate: 'Срок',
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
  const confirm = useConfirm();
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
  const [projectMemberIds, setProjectMemberIds] = useState([]);

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

  useEffect(() => {
    if (!task?.projectId) {
      setProjectMemberIds([]);
      return;
    }
    getProjectMembers(task.projectId)
      .then((ids) => setProjectMemberIds(Array.isArray(ids) ? ids : []))
      .catch(() => setProjectMemberIds([]));
  }, [task?.projectId]);

  const assigneeSelectUserIds = useMemo(() => {
    const ids = [...projectMemberIds];
    const cur = task?.assigneeId;
    if (cur != null && !ids.includes(cur)) {
      ids.unshift(cur);
    }
    return ids;
  }, [projectMemberIds, task?.assigneeId]);

  const projectName = (pid) => projects.find((p) => p.id === pid)?.name || `#${pid}`;
  const userName = (uid) => users.find((u) => u.id === uid)?.username || `#${uid}`;

  const formatHistoryValue = (fieldName, raw) => {
    if (raw == null || raw === '') return '—';
    if (fieldName === 'status') return STATUS_LABELS[raw] || raw;
    if (fieldName === 'assigneeId') {
      const id = Number(raw);
      return Number.isFinite(id) ? userName(id) : String(raw);
    }
    if (fieldName === 'dueDate') return formatDate(raw);
    return String(raw);
  };

  const historyFieldTitle = (fieldName) => HISTORY_FIELD_LABELS[fieldName] || fieldName;
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

  const handleDeleteTask = async () => {
    const ok = await confirm({
      title: 'Удалить задачу',
      message: 'Задача будет удалена без возможности восстановления.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;
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

  const handleDeleteComment = async (commentId) => {
    const ok = await confirm({
      title: 'Удалить комментарий',
      message: 'Комментарий будет удалён без возможности восстановления.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;
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

  const handleDeleteAttachment = async (attachmentId) => {
    const ok = await confirm({
      title: 'Удалить вложение',
      message: 'Файл будет удалён из задачи без возможности восстановления.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;
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
        <div className="container page-width task-detail-page">
          <div className="card profile-hero-skeleton"><Skeleton style={{ height: 96 }} /></div>
          <div className="card profile-section"><Skeleton style={{ height: 140 }} /></div>
          <div className="card profile-section"><Skeleton style={{ height: 220 }} /></div>
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="container page-width task-detail-page">
          <section className="card profile-section">
            <p className="error">Задача не найдена.</p>
            <Link to="/tasks">← К списку задач</Link>
          </section>
        </div>
      </Layout>
    );
  }

  const heroLetter = (task.title || 'T').trim().charAt(0).toUpperCase() || 'T';

  return (
    <Layout>
      <div className="container page-width task-detail-page">
        <nav className="breadcrumb task-breadcrumb" aria-label="Навигация">
          <Link to="/tasks">Задачи</Link>
          {task.projectId && (
            <>
              <span className="sep">/</span>
              <Link to={`/projects/${task.projectId}`}>{projectName(task.projectId)}</Link>
            </>
          )}
          <span className="sep">/</span>
          <span className="breadcrumb-current">{task.title}</span>
        </nav>

        <header className="card profile-hero task-detail-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-task-detail" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1 className="task-detail-title">{task.title}</h1>
              <div className="profile-hero-line">
                <p className="profile-hero-sub">
                  {task.projectId ? (
                    <>
                      В проекте:{' '}
                      <Link to={`/projects/${task.projectId}`}>{projectName(task.projectId)}</Link>
                    </>
                  ) : (
                    'Задача без привязки к проекту'
                  )}
                </p>
                <div className="profile-role-chips">
                  <span className={`badge badge-${(task.status || '').toLowerCase()} task-detail-status-chip`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="profile-hero-hint profile-hero-hint-row">
            <p className="muted small profile-hero-hint-text">
              Создана: {formatDate(task.createdAt)} · Обновлена: {formatDate(task.updatedAt)}
            </p>
            <div className="task-detail-hero-actions">
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
        </header>

        {error && <p className="error task-detail-global-error">{error}</p>}

        {editing && canEditTask ? (
          <section className="card profile-section" aria-labelledby="task-edit-heading">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="task-edit-heading">Редактирование</h2>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label htmlFor="task-edit-title">Название</label>
                <input
                  id="task-edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="task-edit-desc">Описание</label>
                <textarea
                  id="task-edit-desc"
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
                  <label htmlFor="task-edit-assignee">Исполнитель</label>
                  {isAdminOrManager ? (
                    <select
                      id="task-edit-assignee"
                      value={editAssigneeId}
                      onChange={(e) => setEditAssigneeId(e.target.value)}
                    >
                      <option value="">— не назначен —</option>
                      {assigneeSelectUserIds.map((uid) => {
                        const u = users.find((x) => x.id === uid);
                        if (!u) return null;
                        const notInProject = !projectMemberIds.includes(uid);
                        const label = notInProject ? `${u.username} (нет в проекте)` : u.username;
                        return (
                          <option key={uid} value={String(uid)}>{label}</option>
                        );
                      })}
                    </select>
                  ) : (
                    <select id="task-edit-assignee" value={editAssigneeId} disabled aria-readonly="true">
                      {editAssigneeId ? (
                        <option value={String(editAssigneeId)}>
                          {users.find((x) => String(x.id) === String(editAssigneeId))?.username
                            || `Пользователь #${editAssigneeId}`}
                        </option>
                      ) : (
                        <option value="">— не назначен —</option>
                      )}
                    </select>
                  )}
                  {isAdminOrManager && (
                    <p className="muted small" style={{ marginTop: '0.35rem' }}>
                      Только участники проекта; иначе сначала добавьте пользователя в проект.
                    </p>
                  )}
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
          </section>
        ) : (
          <section className="card profile-section" aria-labelledby="task-summary-heading">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="task-summary-heading">Сводка</h2>
            </div>
            <div className="task-detail-summary">
              <div className="task-summary-row">
                <span className="task-summary-label">Статус</span>
                <span className={`badge badge-${(task.status || '').toLowerCase()} task-summary-badge`}>
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </div>

              {task.description && (
                <div className="task-summary-row">
                  <span className="task-summary-label">Описание</span>
                  <span className="task-detail-description">{task.description}</span>
                </div>
              )}

              {task.assigneeId && (
                <div className="task-summary-row">
                  <span className="task-summary-label">Исполнитель</span>
                  <span className="task-summary-value">{userName(task.assigneeId)}</span>
                </div>
              )}

              {task.dueDate && (
                <div className="task-summary-row">
                  <span className="task-summary-label">Срок</span>
                  <span className="task-summary-value">{formatDate(task.dueDate)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="analytics-segmented task-detail-tabs" role="tablist" aria-label="Разделы карточки">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'comments'}
            className={activeTab === 'comments' ? 'is-active' : ''}
            onClick={() => setActiveTab('comments')}
          >
            Комментарии ({comments.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'attachments'}
            className={activeTab === 'attachments' ? 'is-active' : ''}
            onClick={() => setActiveTab('attachments')}
          >
            Вложения ({attachments.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={activeTab === 'history' ? 'is-active' : ''}
            onClick={() => setActiveTab('history')}
          >
            История
          </button>
        </div>

        {activeTab === 'comments' && (
          <section className="card profile-section task-detail-tab-panel" aria-labelledby="task-comments-heading" role="tabpanel">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="task-comments-heading">Комментарии</h2>
            </div>
            <div className="task-panel-inner">
              <div className="task-comments-composer">
                <h3 className="task-subsection-title">Новый комментарий</h3>
                <form onSubmit={handleAddComment} className="task-comment-form">
                  <label htmlFor="task-new-comment" className="sr-only">Текст комментария</label>
                  <textarea
                    id="task-new-comment"
                    className="task-comment-textarea"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Напишите комментарий к задаче…"
                    rows={3}
                  />
                  <div className="task-comment-form-footer">
                    <button type="submit" disabled={commentLoading || !newComment.trim()}>
                      {commentLoading ? 'Отправка…' : 'Отправить'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="task-comments-list-wrap">
                <h3 className="task-subsection-title task-subsection-title-spaced">Лента</h3>
                {comments.length === 0 ? (
                  <p className="muted task-panel-empty">Комментариев пока нет.</p>
                ) : (
                  <ul className="task-comment-cards">
                    {comments.map((c) => {
                      const un = userName(c.authorId);
                      const initial = (un && un.charAt(0) !== '#') ? un.charAt(0).toUpperCase() : '?';
                      return (
                        <li key={c.id} className="task-comment-card">
                          <div className="task-comment-card-top">
                            <span className="task-comment-avatar" aria-hidden="true">{initial}</span>
                            <div className="task-comment-card-meta">
                              <span className="task-comment-author">{un}</span>
                              <time className="muted small task-comment-time" dateTime={c.createdAt}>
                                {formatDate(c.createdAt)}
                              </time>
                            </div>
                            {(isAdminOrManager || c.authorId === currentUserId) && (
                              <button
                                type="button"
                                className="small danger task-comment-delete"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                          <p className="task-comment-body">{c.text}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'attachments' && (
          <section className="card profile-section task-detail-tab-panel" aria-labelledby="task-attachments-heading" role="tabpanel">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="task-attachments-heading">Вложения</h2>
            </div>
            <div className="task-panel-inner">
              <div className="task-attachment-upload-block">
                <h3 className="task-subsection-title">Загрузить файл</h3>
                {canUploadAttachment ? (
                  <>
                    <p className="muted small task-attachment-hint">
                      Изображения, PDF, документы и др. Максимум 25 МБ на файл.
                    </p>
                    <form onSubmit={handleUploadAttachment} className="task-attachment-upload-form">
                      <input
                        type="file"
                        className="task-attachment-file-input"
                        onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
                        aria-label="Выбор файла"
                      />
                      <button type="submit" disabled={attachLoading || !attachFile}>
                        {attachLoading ? 'Загрузка…' : 'Загрузить'}
                      </button>
                    </form>
                  </>
                ) : (
                  <p className="muted small">Нет прав на загрузку вложений для этой задачи.</p>
                )}
              </div>
              <div className="task-attachments-grid-wrap">
                <h3 className="task-subsection-title task-subsection-title-spaced">Файлы</h3>
                {attachments.length === 0 ? (
                  <p className="muted task-panel-empty">Вложений пока нет.</p>
                ) : (
                  <ul className="task-attachment-grid">
                    {attachments.map((a) => (
                      <li key={a.id} className="task-attachment-card">
                        <div className="task-attachment-card-main">
                          <div className="task-attachment-card-title-row">
                            <FileTypeIcon type={fileType(a.fileName, a.mimeType)} />
                            <strong className="task-attachment-name">{displayName(a)}</strong>
                          </div>
                          <p className="muted small task-attachment-meta-line">
                            {a.mimeType || 'application/octet-stream'} · {formatBytes(a.fileSize)}
                          </p>
                          <div className="task-attachment-actions">
                            {isPreviewable(a.mimeType) && (
                              <button type="button" className="secondary small" onClick={() => handleOpenAttachment(a)}>
                                Открыть
                              </button>
                            )}
                            <button type="button" className="secondary small" onClick={() => handleDownloadAttachment(a)}>
                              Скачать
                            </button>
                            {(isAdminOrManager || a.uploadedBy === currentUserId) && (
                              <button type="button" className="small danger" onClick={() => handleDeleteAttachment(a.id)}>
                                Удалить
                              </button>
                            )}
                          </div>
                          {isImage(a.mimeType) && (
                            <div className="task-attachment-thumb-wrap">
                              {attachmentThumbs[a.id] ? (
                                <button
                                  type="button"
                                  className="task-attachment-thumb-btn"
                                  onClick={() => handleOpenAttachment(a)}
                                  aria-label={`Открыть превью: ${displayName(a)}`}
                                >
                                  <img
                                    src={attachmentThumbs[a.id]}
                                    alt=""
                                    className="task-attachment-thumb-img"
                                  />
                                </button>
                              ) : (
                                <span className="muted small">Превью загружается…</span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="card profile-section task-detail-tab-panel" aria-labelledby="task-history-heading" role="tabpanel">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="task-history-heading">История изменений</h2>
            </div>
            <div className="task-panel-inner">
              <p className="muted small task-history-intro">
                Хронология правок полей задачи. Новые записи сверху.
              </p>
              {history.length === 0 ? (
                <p className="muted task-panel-empty">Изменений пока не было.</p>
              ) : (
                <ul className="task-history-list">
                  {history.map((h) => (
                    <li key={h.id} className="task-history-card">
                      <div className="task-history-card-head">
                        <span className="task-history-field-chip">{historyFieldTitle(h.fieldName)}</span>
                        <span className="muted small task-history-when">
                          {userName(h.changedBy)} · {formatDate(h.changedAt)}
                        </span>
                      </div>
                      <div className="task-history-diff" aria-label="Было и стало">
                        <div className="task-history-col task-history-col-old">
                          <span className="task-history-col-label">Было</span>
                          <span className="task-history-value">{formatHistoryValue(h.fieldName, h.oldValue)}</span>
                        </div>
                        <span className="task-history-arrow" aria-hidden="true">→</span>
                        <div className="task-history-col task-history-col-new">
                          <span className="task-history-col-label">Стало</span>
                          <span className="task-history-value">{formatHistoryValue(h.fieldName, h.newValue)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
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
