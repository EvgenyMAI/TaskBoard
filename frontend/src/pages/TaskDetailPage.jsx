import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
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
import { STATUS_LABELS } from '../constants/taskStatus';
import { HISTORY_FIELD_LABELS } from '../constants/taskHistoryFields';
import { formatDateTimeRu } from '../utils/dateFormat';
import { formatTaskHistoryFieldValue } from '../utils/taskHistoryFormat';
import { isImageMime, isPreviewableMime, isTextPreviewableMime } from '../utils/attachmentKind';
import TaskCommentsPanel from '../components/task-detail/TaskCommentsPanel';
import TaskAttachmentsPanel from '../components/task-detail/TaskAttachmentsPanel';
import TaskHistoryPanel from '../components/task-detail/TaskHistoryPanel';
import TaskAttachmentViewerModal, { EMPTY_VIEWER } from '../components/task-detail/TaskAttachmentViewerModal';

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
  const [viewer, setViewer] = useState(EMPTY_VIEWER);
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

  const formatHistoryValue = (fieldName, raw) =>
    formatTaskHistoryFieldValue(fieldName, raw, { statusLabels: STATUS_LABELS, userName });

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

  useEffect(() => {
    let cancelled = false;
    const revokeUrls = [];
    const imageAttachments = attachments.filter((a) => isImageMime(a.mimeType));
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
    if (!isPreviewableMime(a.mimeType)) {
      toast.info('Для этого типа файла доступно только скачивание');
      return;
    }
    try {
      const { blob } = await getAttachmentBlob(id, a.id, { preview: true });
      const objectUrl = URL.createObjectURL(blob);
      const mime = (a.mimeType || '').toLowerCase();
      if (isTextPreviewableMime(mime)) {
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
              Создана: {formatDateTimeRu(task.createdAt)} · Обновлена: {formatDateTimeRu(task.updatedAt)}
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
                  <span className="task-summary-value">{formatDateTimeRu(task.dueDate)}</span>
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
          <TaskCommentsPanel
            comments={comments}
            newComment={newComment}
            onNewCommentChange={setNewComment}
            commentLoading={commentLoading}
            onSubmitComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            userName={userName}
            isAdminOrManager={isAdminOrManager}
            currentUserId={currentUserId}
            formatDateTimeRu={formatDateTimeRu}
          />
        )}

        {activeTab === 'attachments' && (
          <TaskAttachmentsPanel
            attachments={attachments}
            attachFile={attachFile}
            onAttachFileChange={setAttachFile}
            attachLoading={attachLoading}
            canUploadAttachment={canUploadAttachment}
            isAdminOrManager={isAdminOrManager}
            currentUserId={currentUserId}
            attachmentThumbs={attachmentThumbs}
            onUploadSubmit={handleUploadAttachment}
            onOpenAttachment={handleOpenAttachment}
            onDownloadAttachment={handleDownloadAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            displayName={displayName}
          />
        )}

        {activeTab === 'history' && (
          <TaskHistoryPanel
            history={history}
            historyFieldTitle={historyFieldTitle}
            formatHistoryValue={formatHistoryValue}
            formatDateTimeRu={formatDateTimeRu}
            userName={userName}
          />
        )}
      </div>
      <TaskAttachmentViewerModal viewer={viewer} onClose={() => setViewer(EMPTY_VIEWER)} />
    </Layout>
  );
}
