import Skeleton from '../Skeleton';

export default function ProjectMembersSection({
  pageSize,
  membersPanelOpen,
  onTogglePanel,
  membersLoading,
  memberSearch,
  onMemberSearchChange,
  onRefreshMembers,
  memberRows,
  filteredMemberRows,
  paginatedMemberRows,
  memberTotalPages,
  memberPageSafe,
  onMemberPageChange,
  onRemoveMember,
  users,
  projectMembers,
  memberToAdd,
  onMemberToAddChange,
  onAddMemberSubmit,
  inviting,
}) {
  return (
    <section className={`card profile-section profile-admin-card project-members-card ${membersPanelOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="profile-admin-toggle"
        aria-expanded={membersPanelOpen}
        aria-controls="project-members-panel"
        id="project-members-heading"
        onClick={onTogglePanel}
      >
        <span className="profile-section-head profile-admin-toggle-inner">
          <span className="profile-section-icon" aria-hidden="true">◆</span>
          <span className="profile-admin-toggle-text">
            <span className="profile-admin-toggle-title">Участники проекта</span>
            <span className="muted small profile-admin-toggle-desc">
              Список, поиск и приглашение — после раскрытия.
            </span>
          </span>
        </span>
        <span className={`profile-chevron ${membersPanelOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {membersPanelOpen && (
        <div
          id="project-members-panel"
          role="region"
          aria-labelledby="project-members-heading"
          className="profile-admin-panel"
        >
          {membersLoading ? (
            <Skeleton style={{ height: 160 }} />
          ) : (
            <>
              <div className="profile-admin-toolbar">
                <label className="profile-admin-search-label">
                  <span className="sr-only">Поиск участника</span>
                  <input
                    type="search"
                    className="profile-admin-search"
                    placeholder="Поиск по имени, почте или id…"
                    value={memberSearch}
                    onChange={(e) => onMemberSearchChange(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => onRefreshMembers()}
                  disabled={membersLoading}
                >
                  Обновить список
                </button>
              </div>
              <p className="muted small profile-admin-meta">
                В проекте: <strong>{memberRows.length}</strong>
                {memberSearch.trim() ? (
                  <> · по запросу: <strong>{filteredMemberRows.length}</strong></>
                ) : null}
              </p>

              {filteredMemberRows.length === 0 ? (
                <p className="muted profile-admin-empty">
                  {memberRows.length === 0
                    ? 'Пока нет участников. Добавьте пользователя ниже.'
                    : 'Никто не подходит под фильтр. Измените поисковый запрос.'}
                </p>
              ) : (
                <>
                  <div className="role-management project-members-list">
                    {paginatedMemberRows.map(({ uid, user: u, isOwner }) => (
                      <div key={uid} className="role-row project-member-row">
                        <div className="role-row-user">
                          <strong>{u?.username || `#${uid}`}</strong>
                          {isOwner && <span className="muted small"> (владелец)</span>}
                          {u?.email ? (
                            <div className="muted small role-row-email">{u.email}</div>
                          ) : null}
                        </div>
                        {!isOwner ? (
                          <button
                            type="button"
                            className="danger small"
                            onClick={() => onRemoveMember(uid)}
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {memberTotalPages > 1 && (
                    <div className="profile-admin-pagination">
                      <button
                        type="button"
                        className="secondary small"
                        disabled={memberPageSafe <= 1}
                        onClick={() => onMemberPageChange((p) => Math.max(1, p - 1))}
                      >
                        Назад
                      </button>
                      <span className="muted small profile-admin-page-info">
                        Стр. {memberPageSafe} из {memberTotalPages}
                        {' · '}
                        {(memberPageSafe - 1) * pageSize + 1}
                        –
                        {Math.min(memberPageSafe * pageSize, filteredMemberRows.length)}
                        {' '}
                        из {filteredMemberRows.length}
                      </span>
                      <button
                        type="button"
                        className="secondary small"
                        disabled={memberPageSafe >= memberTotalPages}
                        onClick={() => onMemberPageChange((p) => Math.min(memberTotalPages, p + 1))}
                      >
                        Вперёд
                      </button>
                    </div>
                  )}
                </>
              )}

              <form onSubmit={onAddMemberSubmit} className="project-members-invite">
                <div className="form-group">
                  <label htmlFor="project-add-member">Добавить участника</label>
                  <select
                    id="project-add-member"
                    value={memberToAdd}
                    onChange={(e) => onMemberToAddChange(e.target.value)}
                  >
                    <option value="">— выбрать пользователя —</option>
                    {users
                      .filter((u) => !(projectMembers || []).includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}{u.email ? ` (${u.email})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" disabled={inviting || !memberToAdd}>
                    {inviting ? 'Добавление...' : 'Добавить в проект'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </section>
  );
}
