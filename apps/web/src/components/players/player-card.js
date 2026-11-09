import { escapeHtml } from '../../utils/html.js';

export function renderPlayerCard(player) {
  const name = player.name ?? player.fullName ?? 'Unknown player';
  const team = player.team?.name ?? player.teamName ?? 'Club unavailable';
  const position = player.position ?? 'Position unavailable';

  const photo = /^https:\/\//i.test(player.photoUrl ?? '')
    ? `<img src="${escapeHtml(player.photoUrl)}" alt="" loading="lazy">`
    : '<span class="player-avatar-placeholder" aria-hidden="true">👤</span>';

  return `
    <article class="player-card">
      <div class="player-card-photo">${photo}</div>
      <div class="player-card-content">
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(team)}</p>
        <span class="player-position">${escapeHtml(position)}</span>
      </div>
    </article>
  `;
}
