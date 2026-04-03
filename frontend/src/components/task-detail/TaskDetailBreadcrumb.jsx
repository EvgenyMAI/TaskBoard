import { Link } from 'react-router-dom';

export default function TaskDetailBreadcrumb({ task, projectName }) {
  return (
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
  );
}
