import { escapeHtml } from '../../utils/html.js';

const METRICS = {
  points: {
    label: 'League points',
    get: row => row.overall?.points,
  },
  goals: {
    label: 'Goals scored',
    get: row => row.overall?.goalsFor,
  },
  defense: {
    label: 'Fewest goals conceded',
    get: row => row.overall?.goalsAgainst,
    ascending: true,
  },
  home: {
    label: 'Home points',
    get: row => row.home?.points,
  },
  away: {
    label: 'Away points',
    get: row => row.away?.points,
  },
};

export function rankTeams(teams, metric = 'points') {
  const definition = METRICS[metric] ?? METRICS.points;

  return [...teams]
    .filter(team => Number.isFinite(Number(definition.get(team))))
    .sort((a, b) => {
      const aValue = Number(definition.get(a));
      const bValue = Number(definition.get(b));

      const difference = definition.ascending
        ? aValue - bValue
        : bValue - aValue;

      return difference ||
        String(a.team?.name ?? '').localeCompare(
          String(b.team?.name ?? '')
        );
    });
}

export function renderTeamRankings(teams, metric = 'points') {
  const definition = METRICS[metric] ?? METRICS.points;
  const ranked = rankTeams(teams, metric);
  const maximum = Math.max(
    1,
    ...ranked.map(row => Number(definition.get(row)))
  );

  if (!ranked.length) {
    return '<p>No ranking data available.</p>';
  }

  return `
    <div class="analytics-ranking-list">
      ${ranked.map((row, index) => {
        const score = Number(definition.get(row));
        const percentage = Math.max(
          0,
          Math.min(100, (score / maximum) * 100)
        );

        return `
          <div class="analytics-ranking-row">
            <span class="analytics-ranking-position">
              ${index + 1}
            </span>
            <span class="analytics-ranking-name">
              ${escapeHtml(row.team?.name ?? 'Unknown club')}
            </span>
            <div class="analytics-ranking-track" aria-hidden="true">
              <span style="width:${percentage}%"></span>
            </div>
            <strong class="analytics-ranking-value">
              ${escapeHtml(score)}
            </strong>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function renderVenueComparison(teams) {
  const rows = [...teams].sort(
    (a, b) => (a.position ?? Infinity) - (b.position ?? Infinity)
  );

  return `
    <div class="analytics-table-scroll">
      <table class="analytics-comparison-table">
        <thead>
          <tr>
            <th scope="col">Club</th>
            <th scope="col">Home Pts</th>
            <th scope="col">Away Pts</th>
            <th scope="col">Home W</th>
            <th scope="col">Away W</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <th scope="row">
                ${escapeHtml(row.team?.name ?? 'Unknown club')}
              </th>
              <td>${escapeHtml(row.home?.points ?? '—')}</td>
              <td>${escapeHtml(row.away?.points ?? '—')}</td>
              <td>${escapeHtml(row.home?.won ?? '—')}</td>
              <td>${escapeHtml(row.away?.won ?? '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderRankingSelector(metric = 'points') {
  return `
    <label class="analytics-metric-label">
      Compare by
      <select data-analytics-metric>
        ${Object.entries(METRICS).map(([key, definition]) => `
          <option value="${key}"
            ${key === metric ? 'selected' : ''}>
            ${escapeHtml(definition.label)}
          </option>
        `).join('')}
      </select>
    </label>
  `;
}
