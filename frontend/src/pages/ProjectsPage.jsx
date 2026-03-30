import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api';

export default function ProjectsPage() {
  const toast = useToast();
  const { user } = useAuth();
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
    if (!window.confirm(`Удалить проект «${project.name}»? Все задачи проекта также будут удалены.`)) return;
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
      <div className="container page-width">
        <div className="card page-intro">
          <h1>Проекты</h1>
          <p className="muted">Создавайте проекты и структурируйте задачи по направлениям работы.</p>
        </div>
        <div className="page-header">
          <h2>Список проектов</h2>
          {isAdminOrManager && (
            <button type="button" onClick={openCreate}>
              + Создать проект
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <ul className="card-list">
            <li className="card"><Skeleton style={{ height: 64 }} /></li>
            <li className="card"><Skeleton style={{ height: 64 }} /></li>
            <li className="card"><Skeleton style={{ height: 64 }} /></li>
          </ul>
        ) : projects.length === 0 ? (
          <div className="card">
            <p className="muted">{isAdminOrManager ? 'Нет проектов. Создайте первый проект.' : 'Нет проектов, где вы участник. Администратор назначит вас через задачи.'}</p>
          </div>
        ) : (
          <ul className="card-list">
            {projects.map((p) => (
              <li key={p.id} className="card card-list-item">
                <div className="card-list-item-main">
                  <Link to={`/projects/${p.id}`} className="card-title">
                    {p.name}
                  </Link>
                  {p.description && <p className="muted small">{p.description}</p>}
                </div>
                <div className="card-actions">
                  <Link to={`/projects/${p.id}`} className="btn-link">
                    Открыть
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
