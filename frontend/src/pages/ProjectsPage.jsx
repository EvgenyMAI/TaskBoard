import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api';

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
  const [modal, setModal] = useState(null); // null | 'create' | { type: 'edit', project }
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
        <header className="card profile-hero projects-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-projects" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1>Проекты</h1>
              <div className="profile-hero-line">
                <p className="profile-hero-sub">
                  {username
                    ? `Ваши проекты, ${username}`
                    : 'Задачи сгруппированы по проектам — откройте нужный'}
                </p>
                <div className="profile-role-chips" aria-live="polite">
                  <span className="profile-chip-metric">
                    {loading ? 'Загрузка…' : `Проектов: ${projects.length}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="profile-hero-hint profile-hero-hint-row">
            <p className="muted small profile-hero-hint-text">
              {isAdminOrManager
                ? 'Создайте проект и пригласите команду — всё настраивается в карточке проекта.'
                : 'Откройте проект, в котором вы участник, чтобы увидеть задачи.'}
            </p>
            {isAdminOrManager && (
              <button type="button" onClick={openCreate}>
                + Создать проект
              </button>
            )}
          </div>
        </header>

        {error && <p className="error projects-global-error">{error}</p>}

        <section className="card profile-section" aria-labelledby="projects-list-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="projects-list-heading">Список проектов</h2>
          </div>
          {loading ? (
            <ul className="projects-card-list">
              <li className="card projects-card-item-skeleton"><Skeleton style={{ height: 72 }} /></li>
              <li className="card projects-card-item-skeleton"><Skeleton style={{ height: 72 }} /></li>
              <li className="card projects-card-item-skeleton"><Skeleton style={{ height: 72 }} /></li>
            </ul>
          ) : projects.length === 0 ? (
            <p className="muted projects-empty">
              {isAdminOrManager
                ? 'Нет проектов. Создайте первый проект.'
                : 'Нет проектов, где вы участник. Администратор может добавить вас в состав проекта.'}
            </p>
          ) : (
            <ul className="projects-card-list">
              {projects.map((p) => (
                <li key={p.id} className="card projects-card-item">
                  <div className="projects-card-item-main">
                    <Link to={`/projects/${p.id}`} className="projects-card-title">
                      {p.name}
                    </Link>
                    {p.description && <p className="muted small projects-card-desc">{p.description}</p>}
                  </div>
                  <div className="projects-card-actions">
                    <Link to={`/projects/${p.id}`} className="btn-link">
                      Открыть →
                    </Link>
                    {isAdminOrManager && (
                      <>
                        <button type="button" className="secondary small" onClick={() => openEdit(p)}>
                          Изменить
                        </button>
                        <button type="button" className="danger small" onClick={() => handleDelete(p)}>
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Новый проект' : 'Редактировать проект'}
          onClose={closeModal}
        >
            <form onSubmit={handleSubmit}>
              <FormField label="Название" error={touched && nameError ? nameError : ''}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={touched && nameError ? 'input-invalid' : ''}
                  required
                  autoFocus
                />
              </FormField>
              <FormField label="Описание">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </FormField>
              {error && <p className="error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="secondary" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" disabled={submitLoading || Boolean(nameError)}>
                  {submitLoading ? 'Сохранение...' : modal === 'create' ? 'Создать' : 'Сохранить'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </Layout>
  );
}
