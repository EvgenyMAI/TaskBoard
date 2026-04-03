export default function TaskDetailTabList({ activeTab, onTabChange, commentsCount, attachmentsCount }) {
  return (
    <div className="analytics-segmented task-detail-tabs" role="tablist" aria-label="Разделы карточки">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'comments'}
        className={activeTab === 'comments' ? 'is-active' : ''}
        onClick={() => onTabChange('comments')}
      >
        Комментарии ({commentsCount})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'attachments'}
        className={activeTab === 'attachments' ? 'is-active' : ''}
        onClick={() => onTabChange('attachments')}
      >
        Вложения ({attachmentsCount})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'history'}
        className={activeTab === 'history' ? 'is-active' : ''}
        onClick={() => onTabChange('history')}
      >
        История
      </button>
    </div>
  );
}
