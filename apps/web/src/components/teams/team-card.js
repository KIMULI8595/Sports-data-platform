import { escapeHtml } from '../../utils/html.js';
import { renderFavoriteButton } from '../favorites/favorite-button.js';

export function renderTeamCard(team, standing = null, selected = false) {
  const id = String(team.publicId ?? '');
  const name = String(team.name ?? 'Unknown club');
  const logo = /^https:\/\//i.test(team.logoUrl ?? '')
    ? `<img src="${escapeHtml(team.logoUrl)}" alt="" loading="lazy" width="52" height="52">`
    : '<span aria-hidden="true">⚽</span>';

  return `
    <div class="favorite-team-item">
    <button type="button" class="team-card"
      data-team-id="${escapeHtml(id)}"
      aria-pressed="${selected}">
      <span class="team-card-logo">${logo}</span>
      <span class="team-card-info">
        <strong>${escapeHtml(name)}</strong>
        <small>${standing
          ? `League position #${escapeHtml(standing.position)}`
          : 'League position unavailable'}</small>
      </span>
      <span class="team-card-points">
        <strong>${standing?.points ?? '—'}</strong>
        <small>PTS</small>
      </span>
    </button>
      ${renderFavoriteButton('team', team)}
    </div>
  `;
}
