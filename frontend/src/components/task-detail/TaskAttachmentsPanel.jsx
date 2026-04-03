import AttachmentFileTypeIcon from './AttachmentFileTypeIcon';
import { attachmentFileKind, formatFileSizeBytes, isImageMime, isPreviewableMime } from '../../utils/attachmentKind';

export default function TaskAttachmentsPanel({
  attachments,
  attachFile,
  onAttachFileChange,
  attachLoading,
  canUploadAttachment,
  isAdminOrManager,
  currentUserId,
  attachmentThumbs,
  onUploadSubmit,
  onOpenAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  displayName,
}) {
  return (
    <section className="card profile-section task-detail-tab-panel" aria-labelledby="task-attachments-heading" role="tabpanel">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="task-attachments-heading">Вложения</h2>
      </div>
      <div className="task-panel-inner">
        <div className="task-attachment-upload-block">
          <h3 className="task-subsection-title">Загрузить файл</h3>
          {canUploadAttachment ? (
            <>
              <p className="muted small task-attachment-hint">
                Изображения, PDF, документы и др. Максимум 25 МБ на файл.
              </p>
              <form onSubmit={onUploadSubmit} className="task-attachment-upload-form">
                <input
                  type="file"
                  className="task-attachment-file-input"
                  onChange={(e) => onAttachFileChange(e.target.files?.[0] || null)}
                  aria-label="Выбор файла"
                />
                <button type="submit" disabled={attachLoading || !attachFile}>
                  {attachLoading ? 'Загрузка…' : 'Загрузить'}
                </button>
              </form>
            </>
          ) : (
            <p className="muted small">Нет прав на загрузку вложений для этой задачи.</p>
          )}
        </div>
        <div className="task-attachments-grid-wrap">
          <h3 className="task-subsection-title task-subsection-title-spaced">Файлы</h3>
          {attachments.length === 0 ? (
            <p className="muted task-panel-empty">Вложений пока нет.</p>
          ) : (
            <ul className="task-attachment-grid">
              {attachments.map((a) => (
                <li key={a.id} className="task-attachment-card">
                  <div className="task-attachment-card-main">
                    <div className="task-attachment-card-title-row">
                      <AttachmentFileTypeIcon type={attachmentFileKind(a.fileName, a.mimeType)} />
                      <strong className="task-attachment-name">{displayName(a)}</strong>
                    </div>
                    <p className="muted small task-attachment-meta-line">
                      {a.mimeType || 'application/octet-stream'} · {formatFileSizeBytes(a.fileSize)}
                    </p>
                    <div className="task-attachment-actions">
                      {isPreviewableMime(a.mimeType) && (
                        <button type="button" className="secondary small" onClick={() => onOpenAttachment(a)}>
                          Открыть
                        </button>
                      )}
                      <button type="button" className="secondary small" onClick={() => onDownloadAttachment(a)}>
                        Скачать
                      </button>
                      {(isAdminOrManager || a.uploadedBy === currentUserId) && (
                        <button type="button" className="small danger" onClick={() => onDeleteAttachment(a.id)}>
                          Удалить
                        </button>
                      )}
                    </div>
                    {isImageMime(a.mimeType) && (
                      <div className="task-attachment-thumb-wrap">
                        {attachmentThumbs[a.id] ? (
                          <button
                            type="button"
                            className="task-attachment-thumb-btn"
                            onClick={() => onOpenAttachment(a)}
                            aria-label={`Открыть превью: ${displayName(a)}`}
                          >
                            <img
                              src={attachmentThumbs[a.id]}
                              alt=""
                              className="task-attachment-thumb-img"
                            />
                          </button>
                        ) : (
                          <span className="muted small">Превью загружается…</span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
