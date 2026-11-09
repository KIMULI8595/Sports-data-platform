import { escapeHtml } from '../../utils/html.js';

export function renderSettingsSection({
  id,
  title,
  description = '',
  content = '',
}) {
  return `
    <section class="settings-section"
      aria-labelledby="settings-${escapeHtml(id)}">
      <div class="settings-section-heading">
        <h2 id="settings-${escapeHtml(id)}">
          ${escapeHtml(title)}
        </h2>
        ${description
          ? `<p>${escapeHtml(description)}</p>`
          : ''}
      </div>
      <div class="settings-section-body">
        ${content}
      </div>
    </section>
  `;
}
