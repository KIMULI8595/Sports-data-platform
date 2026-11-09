import { escapeHtml, renderEmpty } from '../../utils/html.js';

export function extractStandingsRows(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.standings)) {
    return result.standings;
  }

  if (Array.isArray(result?.table)) {
    return result.table;
  }

  if (Array.isArray(result?.rows)) {
    return result.rows;
  }

  return [];
}

function number(value) {
  return Number.isFinite(Number(value)) && value != null
    ? String(Number(value))
    : '–';
}

export function renderStandingsTable(result) {
  const rows = extractStandingsRows(result);

  if (!rows.length) {
    return renderEmpty('Standings are not available.');
  }

  const body = rows.map((row, index) => {
    const team = row.team?.name ?? row.teamName ??
      row.name ?? 'Unknown team';

    const stats = row.overall ?? row;

    const position = row.position ?? row.rank ?? index + 1;
    const played = stats.played ?? stats.matchesPlayed;
    const won = stats.won ?? stats.wins;
    const drawn = stats.drawn ?? stats.draws;
    const lost = stats.lost ?? stats.losses;
    const difference = stats.goalDifference ??
      stats.goalsDifference;
    const points = stats.points ?? row.points;

    return `
      <tr>
        <td>${escapeHtml(position)}</td>
        <th scope="row">${escapeHtml(team)}</th>
        <td>${number(played)}</td>
        <td>${number(won)}</td>
        <td>${number(drawn)}</td>
        <td>${number(lost)}</td>
        <td>${number(difference)}</td>
        <td><strong>${number(points)}</strong></td>
      </tr>
    `;
  }).join('');

  return `
    <div class="standings-table-wrapper">
      <table class="standings-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Club</th>
            <th scope="col">P</th>
            <th scope="col">W</th>
            <th scope="col">D</th>
            <th scope="col">L</th>
            <th scope="col">GD</th>
            <th scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}