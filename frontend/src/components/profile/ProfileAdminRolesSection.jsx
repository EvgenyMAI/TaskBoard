import Skeleton from '../Skeleton';
import { roleLabel } from '../../utils/roles';

export default function ProfileAdminRolesSection({
  rolesPanelOpen,
  onTogglePanel,
  adminUsersLoading,
  adminUsersError,
  adminUsers,
  onRetryLoad,
  adminUserSearch,
  onAdminUserSearchChange,
  filteredCount,
  paginatedUsers,
  profile,
  rolesSaving,
  onUpdateRoles,
  getPrimaryRole,
  adminUsersTotalPages,
  adminUserPageSafe,
  pageSize,
  onPagePrev,
  onPageNext,
}) {
  return (
    <section className={`card profile-section profile-admin-card ${rolesPanelOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="profile-admin-toggle"
        aria-expanded={rolesPanelOpen}
        aria-controls="profile-admin-roles-panel"
        id="profile-admin-roles-heading"
        onClick={onTogglePanel}
      >
        <span className="profile-section-head profile-admin-toggle-inner">
          <span className="profile-section-icon" aria-hidden="true">◆</span>
          <span className="profile-admin-toggle-text">
            <span className="profile-admin-toggle-title">Управление ролями</span>
            <span className="muted small profile-admin-toggle-desc">
              Список пользователей и поиск — после раскрытия.
            </span>
          </span>
        </span>
        <span className={`profile-chevron ${rolesPanelOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {rolesPanelOpen && (
        <div
          id="profile-admin-roles-panel"
          role="region"
          aria-labelledby="profile-admin-roles-heading"
          className="profile-admin-panel"
        >
          <p className="muted small profile-admin-note">
            Изменения ролей вступают в силу после повторного входа (новый JWT).
          </p>

          {adminUsersLoading && (
            <Skeleton style={{ height: 200 }} />
          )}

          {!adminUsersLoading && adminUsersError && (
            <div className="profile-admin-error">
              <p className="error">{adminUsersError}</p>
              <button
                type="button"
                className="secondary small"
                onClick={() => onRetryLoad({ force: true })}
              >
                Повторить загрузку
              </button>
            </div>
          )}

          {!adminUsersLoading && !adminUsersError && adminUsers.length > 0 && (
            <>
              <div className="profile-admin-toolbar">
                <label className="profile-admin-search-label">
                  <span className="sr-only">Поиск по имени или почте</span>
                  <input
                    type="search"
                    className="profile-admin-search"
                    placeholder="Поиск по имени или почте…"
                    value={adminUserSearch}
                    onChange={(e) => onAdminUserSearchChange(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => onRetryLoad({ force: true })}
                  disabled={adminUsersLoading}
                >
                  Обновить список
                </button>
              </div>
              <p className="muted small profile-admin-meta">
                Всего в системе: <strong>{adminUsers.length}</strong>
                {adminUserSearch.trim() ? (
                  <> · по запросу: <strong>{filteredCount}</strong></>
                ) : null}
              </p>

              {filteredCount === 0 ? (
                <p className="muted profile-admin-empty">Никто не подходит под фильтр. Измените поисковый запрос.</p>
              ) : (
                <>
                  <div className="role-management">
                    {paginatedUsers.map((u) => (
                      <div key={u.id} className="role-row">
                        <div className="role-row-user">
                          <strong>{u.username}</strong>
                          {profile?.id === u.id && <span className="muted small"> (вы)</span>}
                          {u.email ? (
                            <div className="muted small role-row-email">{u.email}</div>
                          ) : null}
                        </div>
                        <select
                          disabled={rolesSaving}
                          value={getPrimaryRole(u.roles)}
                          onChange={(e) => onUpdateRoles(u.id, e.target.value)}
                          aria-label={`Роль для ${u.username}`}
                        >
                          <option value="EXECUTOR">{roleLabel('EXECUTOR')}</option>
                          <option value="MANAGER">{roleLabel('MANAGER')}</option>
                          <option value="ADMIN">{roleLabel('ADMIN')}</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  {adminUsersTotalPages > 1 && (
                    <div className="profile-admin-pagination">
                      <button
                        type="button"
                        className="secondary small"
                        disabled={adminUserPageSafe <= 1}
                        onClick={onPagePrev}
                      >
                        Назад
                      </button>
                      <span className="muted small profile-admin-page-info">
                        Стр. {adminUserPageSafe} из {adminUsersTotalPages}
                        {' · '}
                        {(adminUserPageSafe - 1) * pageSize + 1}
                        –
                        {Math.min(adminUserPageSafe * pageSize, filteredCount)}
                        {' '}
                        из {filteredCount}
                      </span>
                      <button
                        type="button"
                        className="secondary small"
                        disabled={adminUserPageSafe >= adminUsersTotalPages}
                        onClick={onPageNext}
                      >
                        Вперёд
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!adminUsersLoading && !adminUsersError && adminUsers.length === 0 && (
            <p className="muted">Пользователи не найдены.</p>
          )}
        </div>
      )}
    </section>
  );
}
