const ROLE_LABELS_RU = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  EXECUTOR: 'Исполнитель',
};

export function roleLabel(role) {
  return ROLE_LABELS_RU[role] || role || '—';
}

export function roleLabels(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  return roles.map((r) => roleLabel(r));
}

