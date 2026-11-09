import { escapeHtml } from '../../utils/html.js';

function value(number) {
  return number == null ? '—' : escapeHtml(number);
}

function renderStatRow(label, stats) {
  if (!stats) {
    return `<tr><th scope="row">${escapeHtml(label)}</th>
      <td colspan="7">Unavailable</td></tr>`;
  }

  return `
    <tr>
      <th scope="row">${escapeHtml(label)}</th>
      <td>${value(stats.played)}</td>
      <td>${value(stats.won)}</td>
      <td>${value(stats.drawn)}</td>
      <td>${value(stats.lost)}</td>
      <td>${value(stats.goalsFor)}</td>
      <td>${value(stats.goalsAgainst)}</td>
      <td>${value(stats.points)}</td>
    </tr>
  `;
}

export function renderTeamStatistics(analytics) {
  if (!analytics) {
    return '<p>Team performance statistics are unavailable.</p>';
  }

  const form = Array.isArray(analytics.recentForm)
    ? analytics.recentForm
    : [];

  return `
    <section class="team-statistics" aria-labelledby="team-stats-title">
      <h2 id="team-stats-title">
        ${escapeHtml(analytics.team?.name ?? 'Club')} — Season Performance
      </h2>
      <p>League position: <strong>#${value(analytics.position)}</strong></p>

      <div class="standings-table-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th scope="col">Venue</th>
              <th scope="col">P</th>
              <th scope="col">W</th>
              <th scope="col">D</th>
              <th scope="col">L</th>
              <th scope="col">GF</th>
              <th scope="col">GA</th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${renderStatRow('Overall', analytics.overall)}
            ${renderStatRow('Home', analytics.home)}
            ${renderStatRow('Away', analytics.away)}
          </tbody>
        </table>
      </div>

      <h3>Recent Form</h3>
      <p class="team-form">
        ${form.length
          ? form.map(result => `
              <span class="team-form-result" title="${escapeHtml(result)}">
                ${escapeHtml(result)}
              </span>
            `).join('')
          : 'Recent form unavailable'}
      </p>
    </section>
  `;
}
