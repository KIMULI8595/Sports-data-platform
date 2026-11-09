import { footballApi } from '../services/football.js';
import { escapeHtml, renderError, renderLoading } from '../utils/html.js';
import { renderTeamCard } from '../components/teams/team-card.js';
import { filterAndSortTeams } from '../components/teams/team-filters.js';
import { renderTeamStatistics } from '../components/teams/team-statistics.js';

export const TEAM_SEASON_ID = 'f46e44cf-e0de-437a-96f2-3e5c66134777';

export function extractTeams(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.teams)) return response.teams;
  return [];
}

export function renderTeamsPage(teams, standings, analytics, state = {}) {
  const search = state.search ?? '';
  const sort = state.sort ?? 'position';

  const visible = filterAndSortTeams(teams, standings, { search, sort });

  const standingsById = new Map(
    standings.map(row => [row.team?.publicId, row])
  );

  const analyticsById = new Map(
    analytics.map(row => [row.team?.publicId, row])
  );

  const selectedId = state.selectedId ?? visible[0]?.publicId ?? null;
  const selected = teams.find(team => team.publicId === selectedId);
  const selectedAnalytics = analyticsById.get(selectedId);

  return `
    <div class="dashboard-page teams-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / CLUBS</p>
        <h1>Teams</h1>
        <p>Uganda Premier League — 2024/25 season</p>
      </header>

      <section class="dashboard-section">
        <div class="section-heading">
          <h2>Club Directory</h2>
          <span>${visible.length} of ${teams.length} clubs</span>
        </div>

        <div class="team-controls">
          <label>
            Search clubs
            <input type="search" data-team-search
              placeholder="Search by club name"
              value="${escapeHtml(search)}">
          </label>

          <label>
            Sort clubs
            <select data-team-sort>
              <option value="position" ${sort === 'position' ? 'selected' : ''}>League position</option>
              <option value="name" ${sort === 'name' ? 'selected' : ''}>Club name</option>
              <option value="points" ${sort === 'points' ? 'selected' : ''}>Points</option>
            </select>
          </label>
        </div>

        <div class="teams-grid" data-team-grid>
          ${visible.length
            ? visible.map(team =>
                renderTeamCard(
                  team,
                  standingsById.get(team.publicId),
                  team.publicId === selectedId
                )
              ).join('')
            : '<p>No clubs match your search.</p>'}
        </div>
      </section>

      <section class="dashboard-section" data-team-details>
        ${selected
          ? renderTeamStatistics(selectedAnalytics)
          : '<p>Select a club to view its statistics.</p>'}
      </section>
    </div>
  `;
}

export async function mountTeams(container) {
  const controller = new AbortController();
  let active = true;

  const state = {
    search: '',
    sort: 'position',
    selectedId: null,
  };

  let teams = [];
  let standings = [];
  let analytics = [];

  function render() {
    if (!active) return;
    container.innerHTML = renderTeamsPage(
      teams, standings, analytics, state
    );
  }

  function handleInput(event) {
    if (!event.target.matches('[data-team-search]')) return;

    const input = event.target;
    const cursor = input.selectionStart;

    state.search = input.value;
    render();

    const replacement = container.querySelector('[data-team-search]');
    replacement?.focus();

    if (cursor != null) {
      replacement?.setSelectionRange(cursor, cursor);
    }
  }

  function handleChange(event) {
    if (!event.target.matches('[data-team-sort]')) return;
    state.sort = event.target.value;
    render();
  }

  function handleClick(event) {
    const card = event.target.closest?.('[data-team-id]');
    if (!card) return;

    state.selectedId = card.dataset.teamId;
    render();
  }

  container.addEventListener('input', handleInput);
  container.addEventListener('change', handleChange);
  container.addEventListener('click', handleClick);

  container.innerHTML = renderLoading('Loading clubs and analytics...');

  try {
    const [teamsResponse, standingsResponse, analyticsResponse] =
      await Promise.all([
        footballApi.getTeams({ signal: controller.signal }),
        footballApi.getStandings(TEAM_SEASON_ID, {
          signal: controller.signal,
        }),
        footballApi.getTeamAnalytics(TEAM_SEASON_ID, {
          signal: controller.signal,
        }),
      ]);

    if (!active) return;

    teams = extractTeams(teamsResponse);

    standings = Array.isArray(standingsResponse)
      ? standingsResponse
      : standingsResponse?.standings ?? [];

    analytics = Array.isArray(analyticsResponse?.teams)
      ? analyticsResponse.teams
      : [];

    if (!teams.length) {
      throw new Error('No team records were returned by the API.');
    }

    state.selectedId =
      standings[0]?.team?.publicId ?? teams[0].publicId;

    render();
  } catch (error) {
    if (active && error.name !== 'AbortError') {
      container.innerHTML = renderError(error.message);
    }
  }

  return () => {
    active = false;
    controller.abort();
    container.removeEventListener('input', handleInput);
    container.removeEventListener('change', handleChange);
    container.removeEventListener('click', handleClick);
  };
}
