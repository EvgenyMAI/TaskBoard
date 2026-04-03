import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api';
import ProjectsPageHeader from '../components/projects/ProjectsPageHeader';
import ProjectsListSection from '../components/projects/ProjectsListSection';
import ProjectFormModal from '../components/projects/ProjectFormModal';

export default function ProjectsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : 'P';
  const isAdminOrManager = Boolean(user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER'));
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = name.trim().length < 2 ? 'Название проекта должно быть не короче 2 символов' : '';

  const load = () => {
    setLoading(true);
    setError('');
    getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const openCreate = () => {
    if (!isAdminOrManager) return;
    setModal('create');
    setName('');
    setDescription('');
    setTouched(false);
  };

  const openEdit = (project) => {
    setModal({ type: 'edit', project });
    setName(project.name);
    setDescription(project.description || '');
    setTouched(false);
  };

  const closeModal = () => {
    setModal(null);
    setName('');
    setDescription('');
    setTouched(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (nameError) return;
    setSubmitLoading(true);
    setError('');
    try {
      if (modal === 'create') {
        await createProject({ name, description });
        toast.success('Проект создан');
      } else {
        await updateProject(modal.project.id, { name, description });
        toast.success('Проект обновлён');
      }
      closeModal();
      load();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (project) => {
    const ok = await confirm({
      title: 'Удалить проект',
      message: `Проект «${project.name}» и все его задачи будут удалены без возможности восстановления.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;
    setError('');
    try {
      await deleteProject(project.id);
      toast.success('Проект удалён');
      load();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    }
  };

  return (
    <Layout>
      <div className="container page-width projects-page">
        <ProjectsPageHeader
          heroLetter={heroLetter}
          username={username}
          loading={loading}
          projectsCount={projects.length}
          isAdminOrManager={isAdminOrManager}
          onCreateClick={openCreate}
        />

        {error && <p className="error projects-global-error">{error}</p>}

        <ProjectsListSection
          loading={loading}
          projects={projects}
          isAdminOrManager={isAdminOrManager}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      <ProjectFormModal
        modal={modal}
        name={name}
        description={description}
        nameError={nameError}
        touched={touched}
        submitLoading={submitLoading}
        error={error}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onNameBlur={() => setTouched(true)}
      />
    </Layout>
  );
}
