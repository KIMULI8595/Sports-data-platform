import { escapeHtml, renderEmpty } from '../../utils/html.js';
import {
  normalizeMatch,
  formatMatchDate,
} from '../../utils/matches.js';

function renderLogo(url) {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    return '<span class="team-logo-placeholder" aria-hidden="true"></span>';
  }

  return `
    <img
      class="team-logo"
      src="${escapeHtml(url)}"
      alt=""
      width="76"
      height="76"
      loading="lazy"
    >
  `;
}

function renderScore(match) {
  if (match.state === 'scheduled') return 'vs';

  if (match.homeScore === null || match.awayScore === null) {
    return '–';
  }

  return `${match.homeScore} : ${match.awayScore}`;
}

function renderDataSection(title, items, emptyMessage) {
  return `
    <section class="dashboard-section match-detail-section">
      <h2>${escapeHtml(title)}</h2>
      ${Array.isArray(items) && items.length
        ? `<p>${items.length} record(s) available.</p>`
        : renderEmpty(emptyMessage)}
    </section>
  `;
}

export function renderMatchDetails(rawMatch) {
  const match = normalizeMatch(rawMatch);

  const statusLabel = {
    finished: 'Full Time',
    live: 'Live',
    scheduled: 'Scheduled',
  }[match.state] ?? match.status;

  return `
    <div class="match-center-page dashboard-page">
      <header class="page-heading">
        <a class="match-center-back" href="/dashboard" data-link>
          ← Back to Dashboard
        </a>

        <p class="page-eyebrow">SPORTPULSE / MATCH CENTER</p>
        <h1>Match Center</h1>
        <p>${escapeHtml(match.competition || 'Football')}</p>
      </header>

      <section class="dashboard-section match-center-scoreboard"
        aria-label="Match result">

        <p class="match-center-status status-${escapeHtml(match.state)}">
          ${escapeHtml(statusLabel)}
        </p>

        <div class="match-center-teams">
          <div class="match-center-team">
            ${renderLogo(match.homeLogo)}
            <h2>${escapeHtml(match.homeTeam)}</h2>
          </div>

          <div class="match-center-result"
            aria-label="${escapeHtml(match.homeTeam)} ${escapeHtml(renderScore(match))} ${escapeHtml(match.awayTeam)}">
            ${escapeHtml(renderScore(match))}
          </div>

          <div class="match-center-team">
            ${renderLogo(match.awayLogo)}
            <h2>${escapeHtml(match.awayTeam)}</h2>
          </div>
        </div>

        <p class="match-center-date">
          ${escapeHtml(formatMatchDate(match.scheduledStart))}
        </p>
      </section>

      <div class="match-center-sections">
        ${renderDataSection(
          'Match Events',
          rawMatch.events,
          'Event details are not available for this match.'
        )}

        ${renderDataSection(
          'Lineups',
          rawMatch.lineups,
          'Lineup information is not available.'
        )}

        ${renderDataSection(
          'Team Statistics',
          rawMatch.teamStatistics,
          'Team statistics are not available for this match.'
        )}

        ${renderDataSection(
          'Player Statistics',
          rawMatch.playerStatistics,
          'Player statistics are not available for this match.'
        )}
      </div>
    </div>
  `;
}