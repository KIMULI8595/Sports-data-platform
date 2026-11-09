export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function renderEmpty(message = 'No data available.') {
  return `<div class="empty" role="status">${escapeHtml(message)}</div>`;
}

export function renderError(message = 'Unable to load data.') {
  return `
    <div class="empty error-state" role="alert">
      ${escapeHtml(message)}
    </div>
  `;
}

export function renderLoading(message = 'Loading...') {
  return `
    <div class="empty loading-state" role="status">
      ${escapeHtml(message)}
    </div>
  `;
}