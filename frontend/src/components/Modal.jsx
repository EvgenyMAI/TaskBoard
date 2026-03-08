export default function Modal({ title, children, onClose, width = '420px' }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
