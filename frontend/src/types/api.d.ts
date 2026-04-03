/**
 * Сущности API, с которыми работает фронтенд (минимальный набор полей для IDE и JSDoc).
 */

export interface TaskSummary {
  id: number;
  title: string;
  status?: string;
  description?: string;
  projectId?: number;
  assigneeId?: number | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description?: string | null;
}

export interface UserSummary {
  id: number;
  username: string;
  email?: string | null;
  roles?: string[];
}
