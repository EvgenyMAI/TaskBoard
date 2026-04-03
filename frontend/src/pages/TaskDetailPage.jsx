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
import TaskDetailBreadcrumb from '../components/task-detail/TaskDetailBreadcrumb';
import TaskDetailHero from '../components/task-detail/TaskDetailHero';
import TaskDetailEditForm from '../components/task-detail/TaskDetailEditForm';
import TaskDetailSummary from '../components/task-detail/TaskDetailSummary';
import TaskDetailTabList from '../components/task-detail/TaskDetailTabList';

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
        <TaskDetailBreadcrumb task={task} projectName={projectName} />

        <TaskDetailHero
          task={task}
          heroLetter={heroLetter}
          projectName={projectName}
          editing={editing}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
          onEdit={() => setEditing(true)}
          onCancelEdit={() => setEditing(false)}
          onDelete={handleDeleteTask}
        />

        {error && <p className="error task-detail-global-error">{error}</p>}

        {editing && canEditTask ? (
          <TaskDetailEditForm
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editStatus={editStatus}
            setEditStatus={setEditStatus}
            editAssigneeId={editAssigneeId}
            setEditAssigneeId={setEditAssigneeId}
            editDueDate={editDueDate}
            setEditDueDate={setEditDueDate}
            assigneeSelectUserIds={assigneeSelectUserIds}
            users={users}
            projectMemberIds={projectMemberIds}
            isAdminOrManager={isAdminOrManager}
            submitLoading={submitLoading}
            onSubmit={handleSaveTask}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <TaskDetailSummary task={task} userName={userName} />
        )}

        <TaskDetailTabList
          activeTab={activeTab}
          onTabChange={setActiveTab}
          commentsCount={comments.length}
          attachmentsCount={attachments.length}
        />

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
