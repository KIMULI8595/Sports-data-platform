import { escapeHtml } from '../../utils/html.js';

export function renderNotificationCard(notification) {
  const id = String(notification.id ?? '');
  const title = String(notification.title ?? 'Notification');
  const message = String(notification.message ?? '');

  const date = notification.createdAt
    ? new Date(notification.createdAt)
    : null;

  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date unavailable';

  const read = notification.read === true;
  const type = ['match', 'team', 'system'].includes(notification.type)
    ? notification.type
    : 'system';

  const url = String(notification.url ?? '');
  const safeUrl = /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(url)
    ? url
    : '';

  return `
    <article class="notification-card ${read ? 'is-read' : 'is-unread'}">
      <div class="notification-card-icon" aria-hidden="true">
        ${type === 'match' ? '⚽' : type === 'team' ? '★' : '●'}
      </div>

      <div class="notification-card-content">
        <div class="notification-card-heading">
          <h3>${escapeHtml(title)}</h3>
          ${read ? '' : '<span class="notification-unread-dot" aria-label="Unread"></span>'}
        </div>

        ${message ? `<p>${escapeHtml(message)}</p>` : ''}

        <div class="notification-card-meta">
          <span>${escapeHtml(type)}</span>
          <time>${escapeHtml(dateLabel)}</time>
        </div>

        <div class="notification-card-actions">
          ${safeUrl
            ? `<a href="${escapeHtml(safeUrl)}" data-link>View details</a>`
            : ''}

          ${read
            ? ''
            : `<button type="button"
                 data-notification-read="${escapeHtml(id)}">
                 Mark as read
               </button>`}

          <button type="button"
            data-notification-remove="${escapeHtml(id)}">
            Dismiss
          </button>
        </div>
      </div>
    </article>
  `;
}
