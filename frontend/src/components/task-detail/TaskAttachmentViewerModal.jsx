import Modal from '../Modal';

const EMPTY_VIEWER = { open: false, url: '', name: '', mime: '', mode: 'file', text: '' };

export default function TaskAttachmentViewerModal({ viewer, onClose }) {
  if (!viewer.open) return null;
  return (
    <Modal title={viewer.name} onClose={onClose} width="96vw">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {viewer.mode === 'image' ? (
          <img src={viewer.url} alt={viewer.name} style={{ maxWidth: '100%', maxHeight: '85vh' }} />
        ) : (
          <pre style={{ width: '100%', maxHeight: '85vh', overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {viewer.text}
          </pre>
        )}
      </div>
      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <button type="button" className="secondary" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </Modal>
  );
}

export { EMPTY_VIEWER };
