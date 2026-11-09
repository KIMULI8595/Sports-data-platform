import { footballApi } from '../services/football.js';
import { renderCompetitionCard } from '../components/competitions/competition-card.js';
import { renderStandingsTable } from '../components/standings/standings-table.js';
import {
  escapeHtml,
  renderEmpty,
  renderError,
  renderLoading,
} from '../utils/html.js';

export function renderCompetitionsPage(competitions, seasons) {
  return `
    <div class="dashboard-page competitions-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / LEAGUES</p>
        <h1>Competitions</h1>
        <p>Explore available competitions, seasons, and league standings.</p>
      </header>

      <section class="competitions-grid">
        ${competitions.length
          ? competitions.map(competition =>
              renderCompetitionCard(competition, seasons)
            ).join('')
          : renderEmpty('No competitions available.')}
      </section>

      <section class="dashboard-section">
        <h2>Season Standings</h2>

        <label for="competition-season-select">
          Select season
        </label>

        <select id="competition-season-select" data-season-select>
          <option value="">Choose a season</option>

          ${seasons.map(season => `
            <option value="${escapeHtml(season.publicId)}">
              ${escapeHtml(
                season.competition?.name ?? 'Competition'
              )} — ${escapeHtml(season.name)}
            </option>
          `).join('')}
        </select>

        <div data-competition-standings>
          ${renderEmpty('Select a season to view standings.')}
        </div>
      </section>
    </div>
  `;
}

export async function mountCompetitions(container) {
  const controller = new AbortController();
  let active = true;
  let requestVersion = 0;

  async function load() {
    container.innerHTML = renderLoading('Loading competitions...');

    try {
      const [competitions, seasons] = await Promise.all([
        footballApi.getCompetitions({
          signal: controller.signal,
        }),
        footballApi.getSeasons({
          signal: controller.signal,
        }),
      ]);

      if (!Array.isArray(competitions) || !Array.isArray(seasons)) {
        throw new Error('Unexpected competitions API response.');
      }

      if (active) {
        container.innerHTML = renderCompetitionsPage(
          competitions,
          seasons
        );
      }
    } catch (error) {
      if (!active || error.name === 'AbortError') return;
      container.innerHTML = renderError(error.message);
    }
  }

  async function handleChange(event) {
    if (!event.target.matches('[data-season-select]')) return;

    const seasonId = event.target.value;
    const version = ++requestVersion;

    const output = container.querySelector(
      '[data-competition-standings]'
    );

    if (!output) return;

    if (!seasonId) {
      output.innerHTML = renderEmpty(
        'Select a season to view standings.'
      );
      return;
    }

    output.innerHTML = renderLoading('Loading standings...');

    try {
      const standings = await footballApi.getStandings(
        seasonId,
        { signal: controller.signal }
      );

      if (active && version === requestVersion) {
        output.innerHTML = renderStandingsTable(standings);
      }
    } catch (error) {
      if (!active || error.name === 'AbortError') return;

      if (version === requestVersion) {
        output.innerHTML = renderError(error.message);
      }
    }
  }

  container.addEventListener('change', handleChange);
  await load();

  return () => {
    active = false;
    requestVersion++;
    controller.abort();
    container.removeEventListener('change', handleChange);
  };
}