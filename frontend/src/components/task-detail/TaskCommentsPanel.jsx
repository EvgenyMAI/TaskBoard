export default function TaskCommentsPanel({
  comments,
  newComment,
  onNewCommentChange,
  commentLoading,
  onSubmitComment,
  onDeleteComment,
  userName,
  isAdminOrManager,
  currentUserId,
  formatDateTimeRu,
}) {
  return (
    <section className="card profile-section task-detail-tab-panel" aria-labelledby="task-comments-heading" role="tabpanel">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="task-comments-heading">Комментарии</h2>
      </div>
      <div className="task-panel-inner">
        <div className="task-comments-composer">
          <h3 className="task-subsection-title">Новый комментарий</h3>
          <form onSubmit={onSubmitComment} className="task-comment-form">
            <label htmlFor="task-new-comment" className="sr-only">Текст комментария</label>
            <textarea
              id="task-new-comment"
              className="task-comment-textarea"
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              placeholder="Напишите комментарий к задаче…"
              rows={3}
            />
            <div className="task-comment-form-footer">
              <button type="submit" disabled={commentLoading || !newComment.trim()}>
                {commentLoading ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
        <div className="task-comments-list-wrap">
          <h3 className="task-subsection-title task-subsection-title-spaced">Лента</h3>
          {comments.length === 0 ? (
            <p className="muted task-panel-empty">Комментариев пока нет.</p>
          ) : (
            <ul className="task-comment-cards">
              {comments.map((c) => {
                const un = userName(c.authorId);
                const initial = (un && un.charAt(0) !== '#') ? un.charAt(0).toUpperCase() : '?';
                return (
                  <li key={c.id} className="task-comment-card">
                    <div className="task-comment-card-top">
                      <span className="task-comment-avatar" aria-hidden="true">{initial}</span>
                      <div className="task-comment-card-meta">
                        <span className="task-comment-author">{un}</span>
                        <time className="muted small task-comment-time" dateTime={c.createdAt}>
                          {formatDateTimeRu(c.createdAt)}
                        </time>
                      </div>
                      {(isAdminOrManager || c.authorId === currentUserId) && (
                        <button
                          type="button"
                          className="small danger task-comment-delete"
                          onClick={() => onDeleteComment(c.id)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <p className="task-comment-body">{c.text}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
