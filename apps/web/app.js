
const API = localStorage.getItem('sportsApiUrl') || 'http://localhost:3000';

const $ = id => document.getElementById(id);

const escape = value =>
  String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const get = async path => {
  const response = await fetch(`${API}${path}`);

  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }

  return response.json();
};

const empty = message =>
  `<div class="empty">${escape(message)}</div>`;

let data = {
  matches: [],
  teams: [],
  players: [],
  competitions: [],
  seasons: [],
};

let seasonRequestId = 0;

function renderMatches() {
  const filter = $('match-filter').value;

  const matches = data.matches.filter(
    match => filter === 'all' || match.status === filter,
  );

  $('match-list').innerHTML = matches.length
    ? matches.map(match => `
      <article class="card">
        <span class="pill">${escape(match.status.toUpperCase())}</span>
        <small>
          ${escape(match.season?.competition?.name || 'Football')}
          · ${new Date(match.scheduledStart).toLocaleString()}
        </small>

        <div class="score">
          <span>${escape(match.homeTeam?.name || 'Home')}</span>
          <strong>
            ${match.status === 'scheduled'
              ? 'vs'
              : `${match.homeScore} : ${match.awayScore}`}
          </strong>
          <span>${escape(match.awayTeam?.name || 'Away')}</span>
        </div>

        <p class="muted">${escape(match.period || 'Fixture')}</p>
        <button data-match="${escape(match.publicId)}">
          Match center →
        </button>
      </article>
    `).join('')
    : empty('No matches available for this filter.');

  document.querySelectorAll('[data-match]').forEach(button => {
    button.onclick = () => openMatch(button.dataset.match);
  });
}

async function openMatch(id) {
  $('match-detail').hidden = false;
  $('detail-content').innerHTML = empty('Loading match details…');
  $('match-detail').scrollIntoView({ behavior: 'smooth' });

  try {
    const match = await get(`/matches/${id}/details`);

    $('detail-content').innerHTML = `
      <h3>
        ${escape(match.homeTeam.name)}
        ${match.homeScore} –
        ${match.awayScore}
        ${escape(match.awayTeam.name)}
      </h3>

      <p class="muted">
        ${escape(match.status)} · ${escape(match.period || '')}
      </p>

      <h3>Timeline</h3>
      ${match.events.length
        ? match.events.map(event => `
          <div class="list-row">
            <span>
              ${escape(event.minute ?? '–')}′ ·
              ${escape(event.eventType.code)}
            </span>
            <span>
              ${escape(event.team?.name || '')} ·
              ${escape(event.status)}
            </span>
          </div>
        `).join('')
        : empty('No events recorded')}

      <h3>Lineups</h3>
      ${match.lineups.length
        ? match.lineups.map(entry => `
          <div class="list-row">
            <span>${escape(entry.player.name)}</span>
            <small>
              ${escape(entry.team.name)} ·
              ${entry.starter ? 'Starter' : 'Substitute'}
            </small>
          </div>
        `).join('')
        : empty('No lineups recorded')}

      <h3>Team statistics</h3>
      ${match.teamStatistics.length
        ? match.teamStatistics.map(entry => `
          <div class="list-row">
            <span>
              ${escape(entry.team.name)} · ${escape(entry.metric)}
            </span>
            <strong>${escape(entry.value)}</strong>
          </div>
        `).join('')
        : empty('No statistics recorded')}
    `;
  } catch (error) {
    $('detail-content').innerHTML = empty(error.message);
  }
}

function renderForm(form) {
  if (!Array.isArray(form) || form.length === 0) {
    return '<span class="muted">—</span>';
  }

  return `
    <span class="form-strip" aria-label="Recent form: ${escape(form.join(', '))}">
      ${form.map(result => {
        const label = result === 'W'
          ? 'Win'
          : result === 'D'
            ? 'Draw'
            : 'Loss';

        return `
          <span
            class="form-result form-${escape(result.toLowerCase())}"
            title="${label}"
          >${escape(result)}</span>
        `;
      }).join('')}
    </span>
  `;
}

function renderAnalytics(result) {
  const rows = result.teams || [];

  if (!rows.length) {
    $('analytics-list').innerHTML =
      empty('No team analytics available for this season.');
    return;
  }

  $('analytics-list').innerHTML = `
    <p class="muted">
      ${escape(result.season?.name || 'Season')}
      · ${escape(result.totalFinishedMatches)} finished matches
    </p>

    <table class="analytics-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Club</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>GD</th>
          <th>Pts</th>
          <th>Home pts</th>
          <th>Away pts</th>
          <th>Last 5</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${escape(row.position)}</td>
            <td><strong>${escape(row.team.name)}</strong></td>
            <td>${escape(row.overall.played)}</td>
            <td>${escape(row.overall.won)}</td>
            <td>${escape(row.overall.drawn)}</td>
            <td>${escape(row.overall.lost)}</td>
            <td>${escape(row.overall.goalsFor)}</td>
            <td>${escape(row.overall.goalsAgainst)}</td>
            <td>${escape(row.overall.goalDifference)}</td>
            <td><strong>${escape(row.overall.points)}</strong></td>
            <td>${escape(row.home.points)}</td>
            <td>${escape(row.away.points)}</td>
            <td>${renderForm(row.recentForm)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

let currentAnalytics = null;

function renderHomeAway() {
  const container = $('home-away-content');
  const selector = $('performance-team-select');

  if (!currentAnalytics?.teams?.length) {
    container.innerHTML = empty(
      'No team performance data available for this season.'
    );
    return;
  }

  const team = currentAnalytics.teams.find(
    row => row.team.publicId === selector.value
  );

  if (!team) {
    container.innerHTML = empty(
      'Select a team to view home and away performance.'
    );
    return;
  }

  const home = team.home;
  const away = team.away;

  const maxPoints = Math.max(home.points, away.points, 1);

  const homeWidth = (home.points / maxPoints) * 100;
  const awayWidth = (away.points / maxPoints) * 100;

  const performanceCard = (title, stats, type) => `
    <div class="performance-card">
      <p class="eyebrow">${escape(title)}</p>

      <div class="performance-points">
        ${escape(stats.points)}
        <span>points</span>
      </div>

      <div class="performance-stats">
        <div><strong>${escape(stats.played)}</strong><span>Played</span></div>
        <div><strong>${escape(stats.won)}</strong><span>Won</span></div>
        <div><strong>${escape(stats.drawn)}</strong><span>Drawn</span></div>
        <div><strong>${escape(stats.lost)}</strong><span>Lost</span></div>
        <div><strong>${escape(stats.goalsFor)}</strong><span>Goals for</span></div>
        <div><strong>${escape(stats.goalsAgainst)}</strong><span>Goals against</span></div>
        <div><strong>${escape(stats.goalDifference)}</strong><span>Goal difference</span></div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="performance-heading">
      <h3>${escape(team.team.name)}</h3>
      <p class="muted">
        ${escape(team.overall.played)} matches ·
        ${escape(team.overall.points)} total points
      </p>
    </div>

    <div class="performance-grid">
      ${performanceCard('HOME PERFORMANCE', home, 'home')}
      ${performanceCard('AWAY PERFORMANCE', away, 'away')}
    </div>

    <div class="panel performance-comparison">
      <h3>Points comparison</h3>

      <div class="comparison-row">
        <span>Home</span>
        <div class="comparison-track">
          <div class="comparison-fill home-fill"
               style="width: ${homeWidth}%"></div>
        </div>
        <strong>${escape(home.points)}</strong>
      </div>

      <div class="comparison-row">
        <span>Away</span>
        <div class="comparison-track">
          <div class="comparison-fill away-fill"
               style="width: ${awayWidth}%"></div>
        </div>
        <strong>${escape(away.points)}</strong>
      </div>
    </div>
  `;
}

function populatePerformanceTeams(result) {
  currentAnalytics = result;

  const selector = $('performance-team-select');
  const previousSelection = selector.value;

  const teams = result.teams || [];

  selector.innerHTML = teams.map(row => `
    <option value="${escape(row.team.publicId)}">
      ${escape(row.team.name)}
    </option>
  `).join('');

  if (teams.some(row => row.team.publicId === previousSelection)) {
    selector.value = previousSelection;
  } else if (teams.length) {
    selector.value = teams[0].team.publicId;
  }

  renderHomeAway();
}
function renderTeamComparison() {
  const container = $('team-comparison-content');

  if (!currentAnalytics?.teams?.length) {
    container.innerHTML = empty(
      'No team comparison data available for this season.'
    );
    return;
  }

  const idA = $('compare-team-a').value;
  const idB = $('compare-team-b').value;

  if (!idA || !idB) {
    container.innerHTML = empty(
      'Select two teams to compare their performance.'
    );
    return;
  }

  if (idA === idB) {
    container.innerHTML = empty(
      'Please select two different teams.'
    );
    return;
  }

  const teamA = currentAnalytics.teams.find(
    row => row.team.publicId === idA
  );

  const teamB = currentAnalytics.teams.find(
    row => row.team.publicId === idB
  );

  if (!teamA || !teamB) {
    container.innerHTML = empty(
      'Selected team data is unavailable.'
    );
    return;
  }

  const metrics = [
    ['Points', teamA.overall.points, teamB.overall.points],
    ['Wins', teamA.overall.won, teamB.overall.won],
    ['Draws', teamA.overall.drawn, teamB.overall.drawn],
    ['Losses', teamA.overall.lost, teamB.overall.lost],
    ['Goals scored', teamA.overall.goalsFor, teamB.overall.goalsFor],
    ['Goals conceded', teamA.overall.goalsAgainst, teamB.overall.goalsAgainst],
    ['Goal difference', teamA.overall.goalDifference, teamB.overall.goalDifference],
    ['Home points', teamA.home.points, teamB.home.points],
    ['Away points', teamA.away.points, teamB.away.points],
  ];

  const renderMetric = ([label, valueA, valueB]) => {
    // Zero is the baseline. Negative goal differences are
    // displayed numerically rather than as negative-width bars.
    const maximum = Math.max(
      Math.abs(valueA),
      Math.abs(valueB),
      1
    );

    const widthA = Math.max(0, valueA) / maximum * 100;
    const widthB = Math.max(0, valueB) / maximum * 100;

    return `
      <div class="team-compare-metric">
        <div class="team-compare-values">
          <strong>${escape(valueA)}</strong>
          <span>${escape(label)}</span>
          <strong>${escape(valueB)}</strong>
        </div>

        <div class="team-compare-bars">
          <div class="team-compare-track">
            <div
              class="team-compare-fill team-compare-a"
              style="width: ${widthA}%"
            ></div>
          </div>

          <div class="team-compare-track">
            <div
              class="team-compare-fill team-compare-b"
              style="width: ${widthB}%"
            ></div>
          </div>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="team-compare-header">
      <div>
        <h3>${escape(teamA.team.name)}</h3>
        <p class="muted">
          Position ${escape(teamA.position)}
        </p>
      </div>

      <span>VS</span>

      <div>
        <h3>${escape(teamB.team.name)}</h3>
        <p class="muted">
          Position ${escape(teamB.position)}
        </p>
      </div>
    </div>

    <div class="team-compare-metrics">
      ${metrics.map(renderMetric).join('')}
    </div>

    <p class="muted team-compare-note">
      Statistics are season totals, not direct head-to-head
      match results. For negative goal differences, the
      numerical value is authoritative.
    </p>
  `;
}

function populateComparisonTeams(result) {
  const selectorA = $('compare-team-a');
  const selectorB = $('compare-team-b');

  const previousA = selectorA.value;
  const previousB = selectorB.value;

  const teams = result.teams || [];

  const options = teams.map(row => `
    <option value="${escape(row.team.publicId)}">
      ${escape(row.team.name)}
    </option>
  `).join('');

  selectorA.innerHTML = options;
  selectorB.innerHTML = options;

  const hasTeam = id =>
    teams.some(row => row.team.publicId === id);

  selectorA.value = hasTeam(previousA)
    ? previousA
    : (teams[0]?.team.publicId || '');

  selectorB.value = hasTeam(previousB) &&
    previousB !== selectorA.value
      ? previousB
      : (
          teams.find(
            row => row.team.publicId !== selectorA.value
          )?.team.publicId || ''
        );

  renderTeamComparison();
}
async function loadSeasonData() {
  const id = $('season-select').value;
  const requestId = ++seasonRequestId;

  if (!id) {
    $('standings-list').innerHTML =
      empty('Select a season to view standings.');

    $('analytics-list').innerHTML =
      empty('Select a season to view team analytics.');

    return;
  }

  $('standings-list').innerHTML = empty('Loading standings…');
  $('analytics-list').innerHTML = empty('Loading team analytics…');

  const [standingsResult, analyticsResult] = await Promise.allSettled([
    get(`/seasons/${encodeURIComponent(id)}/standings`),
    get(`/seasons/${encodeURIComponent(id)}/analytics/teams`),
  ]);

  // Ignore older responses if the user has selected another season.
  if (requestId !== seasonRequestId) {
    return;
  }

  if (standingsResult.status === 'fulfilled') {
    const rows = standingsResult.value;

    $('standings-list').innerHTML = rows.length
      ? `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${escape(row.position)}</td>
                <td>${escape(row.team.name)}</td>
                <td>${escape(row.played)}</td>
                <td>${escape(row.won)}</td>
                <td>${escape(row.drawn)}</td>
                <td>${escape(row.lost)}</td>
                <td>${escape(row.goalDifference)}</td>
                <td><strong>${escape(row.points)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : empty('No teams registered for this season.');
  } else {
    $('standings-list').innerHTML =
      empty(standingsResult.reason.message);
  }

  if (analyticsResult.status === 'fulfilled') {
    renderAnalytics(analyticsResult.value);
    populatePerformanceTeams(analyticsResult.value);
    populateComparisonTeams(analyticsResult.value);
  } else {
    currentAnalytics = null;
    $('performance-team-select').innerHTML =
      '<option value="">Select a team</option>';
    $('home-away-content').innerHTML =
      empty(analyticsResult.reason.message);
    $('analytics-list').innerHTML =
      empty(analyticsResult.reason.message);
  }
}

async function load() {
  const paths = [
    '/matches',
    '/teams',
    '/players',
    '/competitions',
    '/seasons',
  ];

  const keys = [
    'matches',
    'teams',
    'players',
    'competitions',
    'seasons',
  ];

  const results = await Promise.allSettled(
    paths.map(path => get(path)),
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      data[keys[index]] = result.value;
    }
  });

  const failures = results.filter(
    result => result.status === 'rejected',
  ).length;

  $('api-status').textContent = failures
    ? `API: ${paths.length - failures}/${paths.length} endpoints online`
    : '● API connected';

  $('api-status').style.color = failures
    ? '#ffc785'
    : '#67e2a4';

  $('summary').innerHTML = [
    ['Matches', data.matches.length],
    ['Live now', data.matches.filter(match => match.status === 'live').length],
    ['Teams', data.teams.length],
    ['Players', data.players.length],
  ].map(([label, value]) => `
    <div class="kpi">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `).join('');

  renderMatches();

  $('team-list').innerHTML = data.teams.length
    ? data.teams.map(team => `
      <div class="list-row">
        <span>${escape(team.name)}</span>
        <small>${escape(team.code || team.shortName || '')}</small>
      </div>
    `).join('')
    : empty('No teams loaded');

  $('player-list').innerHTML = data.players.length
    ? data.players.map(player => `
      <div class="list-row">
        <span>${escape(player.name)}</span>
        <small>${escape(player.position || 'Player')}</small>
      </div>
    `).join('')
    : empty('No players loaded');

  $('competition-list').innerHTML = data.competitions.length
    ? data.competitions.map(competition => `
      <article class="card">
        <span class="pill">${escape(competition.type || 'league')}</span>
        <h3>${escape(competition.name)}</h3>
        <small>${escape(competition.shortName || '')}</small>
      </article>
    `).join('')
    : empty('No competitions loaded');

  $('season-select').innerHTML =
    '<option value="">Select a season</option>' +
    data.seasons.map(season => `
      <option value="${escape(season.publicId)}">
        ${escape(season.competition?.name || 'Competition')}
        · ${escape(season.name)}
      </option>
    `).join('');

  if (data.seasons.length) {
    $('season-select').value =
      data.seasons.find(season => season.isCurrent)?.publicId ||
      data.seasons[0].publicId;

    await loadSeasonData();
  } else {
    $('standings-list').innerHTML = empty('No seasons loaded');
    $('analytics-list').innerHTML = empty('No seasons loaded');
  }
}

$('performance-team-select').onchange = renderHomeAway;
$('compare-team-a').onchange = renderTeamComparison;
$('compare-team-b').onchange = renderTeamComparison;
$('match-filter').onchange = renderMatches;
$('season-select').onchange = loadSeasonData;

$('close-detail').onclick = () => {
  $('match-detail').hidden = true;
};

load();

setInterval(async () => {
  try {
    data.matches = await get('/matches');
    renderMatches();
  } catch {
    // Preserve the last successfully loaded matches.
  }
}, 30000);
