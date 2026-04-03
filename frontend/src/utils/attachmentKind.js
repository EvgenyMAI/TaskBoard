export function isImageMime(mime) {
  return Boolean(mime && String(mime).toLowerCase().startsWith('image/'));
}

export function isTextPreviewableMime(mime = '') {
  const m = String(mime).toLowerCase();
  return m.startsWith('text/') || ['application/json', 'application/xml', 'application/csv'].includes(m);
}

export function isPreviewableMime(mime = '') {
  const m = String(mime).toLowerCase();
  return m.startsWith('image/') || isTextPreviewableMime(m);
}

export function attachmentFileKind(name = '', mime = '') {
  const lower = String(name).toLowerCase();
  if (isImageMime(mime)) return 'image';
  if (String(mime).includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
  if (String(mime).includes('word') || lower.endsWith('.doc') || lower.endsWith('.docx')) return 'doc';
  if (String(mime).includes('excel') || lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'sheet';
  if (String(mime).includes('presentation') || lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'slides';
  if (String(mime).startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) return 'text';
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) return 'archive';
  return 'file';
}

export function formatFileSizeBytes(size) {
  if (!size || size < 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
