export default function AnalyticsPeriodSection({
  from,
  to,
  csvLoading,
  onFromChange,
  onToChange,
  onDownloadCsv,
  onPreset,
}) {
  return (
    <section className="dashboard-surface analytics-section" aria-labelledby="analytics-period-heading">
      <div className="dashboard-panel-head">
        <span className="dashboard-panel-kicker">Фильтр</span>
        <h2 className="dashboard-panel-title" id="analytics-period-heading">Период и выгрузка</h2>
      </div>
      <div className="form-row analytics-period-row">
        <div className="form-group">
          <label htmlFor="analytics-from">С даты</label>
          <input
            id="analytics-from"
            type="datetime-local"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="analytics-to">По дату</label>
          <input
            id="analytics-to"
            type="datetime-local"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
        <div className="form-group analytics-export-field">
          <span className="analytics-export-label" id="analytics-export-label">Экспорт</span>
          <div className="analytics-export-actions">
            <button
              type="button"
              className="secondary"
              disabled={csvLoading}
              onClick={onDownloadCsv}
              aria-describedby="analytics-export-label"
            >
              {csvLoading ? 'Выгрузка...' : 'Скачать CSV'}
            </button>
          </div>
        </div>
      </div>
      <div className="analytics-presets" role="group" aria-label="Быстрый выбор периода">
        <button type="button" className="secondary small" onClick={() => onPreset(7)}>7 дней</button>
        <button type="button" className="secondary small" onClick={() => onPreset(30)}>30 дней</button>
        <button type="button" className="secondary small" onClick={() => onPreset(90)}>90 дней</button>
      </div>
    </section>
  );
}
