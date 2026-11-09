import { escapeHtml } from '../../utils/html.js';
import { renderFavoriteButton } from '../favorites/favorite-button.js';
import {
  normalizeMatch,
  formatMatchDate
} from '../../utils/matches.js';

function renderTeamLogo(url, name) {
  if (!url || !/^https:\/\//i.test(url)) {
    return '<span class="team-logo-placeholder" aria-hidden="true"></span>';
  }

  return `
    <img
      class="team-logo"
      src="${escapeHtml(url)}"
      alt=""
      loading="lazy"
      width="32"
      height="32"
    >
  `;
}

function renderScore(match) {
  if (match.state === 'scheduled') {
    return '<span class="match-score-pending">vs</span>';
  }

  if (
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return '<span class="match-score-pending">â€“</span>';
  }

  return `
    <span>${match.homeScore}</span>
    <span class="score-divider">:</span>
    <span>${match.awayScore}</span>
  `;
}

export function renderMatchCard(rawMatch) {
  const match = normalizeMatch(rawMatch);

  const statusLabel = {
    finished: 'FT',
    live: 'LIVE',
    scheduled: 'Scheduled',
  }[match.state] ?? match.status;

  const content = `
    <div class="match-card-header">
      <span class="match-competition">
        ${escapeHtml(match.competition || 'Football')}
      </span>
      <span class="match-status status-${escapeHtml(match.state)}">
        ${escapeHtml(statusLabel)}
      </span>
    </div>

    <div class="match-card-body">
      <div class="match-team match-team-home">
        ${renderTeamLogo(match.homeLogo, match.homeTeam)}
        <span>${escapeHtml(match.homeTeam)}</span>
      </div>

      <div class="match-score">
        ${renderScore(match)}
      </div>

      <div class="match-team match-team-away">
        ${renderTeamLogo(match.awayLogo, match.awayTeam)}
        <span>${escapeHtml(match.awayTeam)}</span>
      </div>
    </div>

    <div class="match-card-footer">
      <time>
        ${escapeHtml(formatMatchDate(match.scheduledStart))}
      </time>
    </div>
  `;

  if (!match.id) {
    return `<article class="match-card">${content}</article>`;
  }

  return `
    <article class="match-card">
      <a
        href="/matches/${encodeURIComponent(match.id)}"
        data-link
        class="match-card-link"
        aria-label="${escapeHtml(match.homeTeam)} versus ${escapeHtml(match.awayTeam)}, ${escapeHtml(statusLabel)}"
      >
        ${content}
      </a>
      ${renderFavoriteButton('match', rawMatch)}
    </article>
  `;
}