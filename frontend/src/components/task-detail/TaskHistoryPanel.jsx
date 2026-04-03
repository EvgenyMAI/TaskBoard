export default function TaskHistoryPanel({
  history,
  historyFieldTitle,
  formatHistoryValue,
  formatDateTimeRu,
  userName,
}) {
  return (
    <section className="card profile-section task-detail-tab-panel" aria-labelledby="task-history-heading" role="tabpanel">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="task-history-heading">История изменений</h2>
      </div>
      <div className="task-panel-inner">
        <p className="muted small task-history-intro">
          Хронология правок полей задачи. Новые записи сверху.
        </p>
        {history.length === 0 ? (
          <p className="muted task-panel-empty">Изменений пока не было.</p>
        ) : (
          <ul className="task-history-list">
            {history.map((h) => (
              <li key={h.id} className="task-history-card">
                <div className="task-history-card-head">
                  <span className="task-history-field-chip">{historyFieldTitle(h.fieldName)}</span>
                  <span className="muted small task-history-when">
                    {userName(h.changedBy)} · {formatDateTimeRu(h.changedAt)}
                  </span>
                </div>
                <div className="task-history-diff" aria-label="Было и стало">
                  <div className="task-history-col task-history-col-old">
                    <span className="task-history-col-label">Было</span>
                    <span className="task-history-value">{formatHistoryValue(h.fieldName, h.oldValue)}</span>
                  </div>
                  <span className="task-history-arrow" aria-hidden="true">→</span>
                  <div className="task-history-col task-history-col-new">
                    <span className="task-history-col-label">Стало</span>
                    <span className="task-history-value">{formatHistoryValue(h.fieldName, h.newValue)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
