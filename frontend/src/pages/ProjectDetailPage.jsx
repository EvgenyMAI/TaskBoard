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
import { useClientPagination } from '../hooks/useClientPagination';
import ProjectMembersSection from '../components/project-detail/ProjectMembersSection';
import ProjectNewTaskSection from '../components/project-detail/ProjectNewTaskSection';
import ProjectTaskFiltersSection from '../components/project-detail/ProjectTaskFiltersSection';
import ProjectTasksListSection from '../components/project-detail/ProjectTasksListSection';

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

  const {
    filteredRows: filteredMemberRows,
    totalPages: memberTotalPages,
    page: memberPageSafe,
    setPage: setMemberPage,
    pageSlice: paginatedMemberRows,
  } = useClientPagination(memberRows, { pageSize: PROJECT_MEMBERS_PAGE_SIZE, search: memberSearch });

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
          <ProjectMembersSection
            pageSize={PROJECT_MEMBERS_PAGE_SIZE}
            membersPanelOpen={membersPanelOpen}
            onTogglePanel={() => setMembersPanelOpen((v) => !v)}
            membersLoading={membersLoading}
            memberSearch={memberSearch}
            onMemberSearchChange={setMemberSearch}
            onRefreshMembers={refreshMembers}
            memberRows={memberRows}
            filteredMemberRows={filteredMemberRows}
            paginatedMemberRows={paginatedMemberRows}
            memberTotalPages={memberTotalPages}
            memberPageSafe={memberPageSafe}
            onMemberPageChange={setMemberPage}
            onRemoveMember={handleRemoveMember}
            users={users}
            projectMembers={projectMembers}
            memberToAdd={memberToAdd}
            onMemberToAddChange={setMemberToAdd}
            onAddMemberSubmit={handleAddMember}
            inviting={inviting}
          />
        )}

        <ProjectNewTaskSection
          showTaskForm={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          taskTitle={taskTitle}
          setTaskTitle={setTaskTitle}
          taskDescription={taskDescription}
          setTaskDescription={setTaskDescription}
          taskStatus={taskStatus}
          setTaskStatus={setTaskStatus}
          taskAssigneeId={taskAssigneeId}
          setTaskAssigneeId={setTaskAssigneeId}
          taskDueDate={taskDueDate}
          setTaskDueDate={setTaskDueDate}
          isExecutor={isExecutor}
          user={user}
          projectMembers={projectMembers}
          users={users}
          submitLoading={submitLoading}
          onSubmit={handleCreateTask}
        />

        <ProjectTaskFiltersSection
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterAssigneeId={filterAssigneeId}
          setFilterAssigneeId={setFilterAssigneeId}
          projectMembers={projectMembers}
          users={users}
        />

        <ProjectTasksListSection tasks={tasks} userName={userName} />
      </div>
    </Layout>
  );
}
