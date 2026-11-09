import { loadDashboardData } from '../services/dashboard.js';
import { renderMatchList } from '../components/matches/match-list.js';
import { renderStandingsTable } from '../components/standings/standings-table.js';
import {
  escapeHtml,
  renderError,
  renderLoading,
} from '../utils/html.js';

function renderStat(label, value) {
  return `
    <article class="dashboard-stat">
      <span class="dashboard-stat-label">${escapeHtml(label)}</span>
      <strong class="dashboard-stat-value">${value}</strong>
    </article>
  `;
}

export function renderDashboard(data) {
  const seasonName = data.selectedSeason?.name ?? 'No season selected';
  const competitionName = data.selectedSeason
    ?.competition?.name ?? 'Football';

  const standingsContent = data.standingsError
    ? renderError(data.standingsError)
    : renderStandingsTable(data.standings);

  return `
    <div class="dashboard-page">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">SPORTPULSE / OVERVIEW</p>
          <h1>Dashboard</h1>
          <p>${escapeHtml(competitionName)} · ${escapeHtml(seasonName)}</p>
        </div>
      </header>

      <section class="dashboard-stats" aria-label="Match summary">
        ${renderStat('Matches', data.summary.total)}
        ${renderStat('Completed', data.summary.finished)}
        ${renderStat('Live', data.summary.live)}
        ${renderStat('Scheduled', data.summary.scheduled)}
      </section>

      <div class="dashboard-content-grid">
        <section class="dashboard-section" aria-labelledby="dashboard-matches-title">
          <div class="section-heading">
            <h2 id="dashboard-matches-title">Recent Results & Fixtures</h2>
            <a href="/fixtures" data-link>View all</a>
          </div>

          ${renderMatchList(data.matches, { limit: 8 })}
        </section>

        <section class="dashboard-section" aria-labelledby="dashboard-standings-title">
          <div class="section-heading">
            <h2 id="dashboard-standings-title">League Standings</h2>
            <a href="/competitions" data-link>Competition</a>
          </div>

          ${standingsContent}
        </section>
      </div>
    </div>
  `;
}

export async function mountDashboard(container) {
  const controller = new AbortController();
  let active = true;

  async function load() {
    container.innerHTML = renderLoading('Loading dashboard...');

    try {
      const data = await loadDashboardData({
        signal: controller.signal,
      });

      if (active) {
        container.innerHTML = renderDashboard(data);
      }
    } catch (error) {
      if (!active || error.name === 'AbortError') return;

      container.innerHTML = `
        ${renderError(error.message)}
        <button type="button" data-dashboard-retry>
          Try again
        </button>
      `;
    }
  }

  const handleRetry = event => {
    if (event.target.closest('[data-dashboard-retry]')) {
      load();
    }
  };

  container.addEventListener('click', handleRetry);

  await load();

  return () => {
    active = false;
    controller.abort();
    container.removeEventListener('click', handleRetry);
  };
}