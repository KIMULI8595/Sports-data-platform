import { escapeHtml } from '../../utils/html.js';

export function calculateLeagueStats(matches, seasonId) {
  const finished = matches.filter(match =>
    match.season?.publicId === seasonId &&
    String(match.status).toLowerCase() === 'finished' &&
    Number.isFinite(Number(match.homeScore)) &&
    Number.isFinite(Number(match.awayScore)) &&
    match.homeScore != null &&
    match.awayScore != null
  );

  const stats = {
    matches: finished.length,
    goals: 0,
    homeWins: 0,
    draws: 0,
    awayWins: 0,
    homeGoals: 0,
    awayGoals: 0,
  };

  for (const match of finished) {
    const home = Number(match.homeScore);
    const away = Number(match.awayScore);

    stats.goals += home + away;
    stats.homeGoals += home;
    stats.awayGoals += away;

    if (home > away) stats.homeWins++;
    else if (home < away) stats.awayWins++;
    else stats.draws++;
  }

  stats.goalsPerMatch = stats.matches
    ? (stats.goals / stats.matches).toFixed(2)
    : '0.00';

  return stats;
}

export function renderStatCard(label, value, description = '') {
  return `
    <article class="analytics-stat-card">
      <span class="analytics-stat-label">${escapeHtml(label)}</span>
      <strong class="analytics-stat-value">${escapeHtml(value)}</strong>
      ${description
        ? `<span class="analytics-stat-description">${escapeHtml(description)}</span>`
        : ''}
    </article>
  `;
}
