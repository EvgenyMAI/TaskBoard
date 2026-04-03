const COLORS = {
  image: '#8b5cf6',
  pdf: '#ef4444',
  doc: '#2563eb',
  sheet: '#16a34a',
  slides: '#ea580c',
  text: '#64748b',
  archive: '#7c3aed',
  file: '#0f766e',
};

export default function AttachmentFileTypeIcon({ type }) {
  const c = COLORS[type] || COLORS.file;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginRight: 6, verticalAlign: 'text-bottom' }}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke={c} strokeWidth="1.8" />
      <path d="M14 3v5h5" stroke={c} strokeWidth="1.8" />
      <rect x="8" y="12" width="8" height="1.8" rx="0.9" fill={c} />
      <rect x="8" y="16" width="6" height="1.8" rx="0.9" fill={c} />
    </svg>
  );
}
