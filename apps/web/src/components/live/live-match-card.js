import { escapeHtml } from '../../utils/html.js';

function renderTeam(team, fallback) {
  const name = team?.name ?? fallback;
  const logo = team?.logoUrl;

  return `
    <div class="live-team">
      ${typeof logo === 'string' && /^https:\/\//i.test(logo)
        ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy">`
        : '<span class="live-team-placeholder" aria-hidden="true">⚽</span>'}
      <span>${escapeHtml(name)}</span>
    </div>
  `;
}

export function renderLiveMatchCard(match) {
  const id = String(match.publicId ?? '');
  const status = String(match.status ?? 'live')
    .replace(/[_-]+/g, ' ')
    .toUpperCase();

  const homeScore = match.homeScore == null
    ? '—'
    : escapeHtml(match.homeScore);

  const awayScore = match.awayScore == null
    ? '—'
    : escapeHtml(match.awayScore);

  return `
    <article class="live-match-card">
      <div class="live-match-header">
        <span class="live-status">
          <span class="live-status-dot" aria-hidden="true"></span>
          ${escapeHtml(status)}
        </span>
        <span class="live-competition">
          ${escapeHtml(match.season?.competition?.name ?? 'Competition unavailable')}
        </span>
      </div>

      <div class="live-match-scoreboard">
        ${renderTeam(match.homeTeam, 'Home team')}

        <div class="live-score" aria-label="Score ${homeScore} to ${awayScore}">
          <strong>${homeScore}</strong>
          <span>:</span>
          <strong>${awayScore}</strong>
        </div>

        ${renderTeam(match.awayTeam, 'Away team')}
      </div>

      ${id
        ? `<a class="live-match-link" data-link
             href="/matches/${escapeHtml(encodeURIComponent(id))}">
             Match details
           </a>`
        : ''}
    </article>
  `;
}
