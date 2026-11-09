import { footballApi } from '../services/football.js';
import { renderMatchList } from '../components/matches/match-list.js';
import {
  filterFixtureMatches,
  paginateMatches,
} from '../components/matches/match-filters.js';
import {
  escapeHtml,
  renderError,
  renderLoading,
} from '../utils/html.js';

const STATUS_OPTIONS = [
  ['all', 'All Matches'],
  ['finished', 'Finished'],
  ['live', 'Live'],
  ['scheduled', 'Scheduled'],
];

function renderFilters(filters) {
  return `
    <div class="dashboard-section fixtures-filters">
      <div class="fixtures-filter-grid">
        <label>
          <span>Search teams</span>
          <input
            type="search"
            data-fixture-search
            value="${escapeHtml(filters.search)}"
            placeholder="Search by team name"
          >
        </label>

        <label>
          <span>Match status</span>
          <select data-fixture-status>
            ${STATUS_OPTIONS.map(([value, label]) => `
              <option value="${value}"
                ${filters.status === value ? 'selected' : ''}>
                ${label}
              </option>
            `).join('')}
          </select>
        </label>

        <label>
          <span>Match date</span>
          <input
            type="date"
            data-fixture-date
            value="${escapeHtml(filters.date)}"
          >
        </label>
      </div>

      <button type="button" data-fixture-reset>
        Clear filters
      </button>
    </div>
  `;
}

function renderResults(matches, filters) {
  const filtered = filterFixtureMatches(matches, filters);

  const sorted = [...filtered].sort((a, b) =>
    new Date(b.scheduledStart ?? 0) -
    new Date(a.scheduledStart ?? 0)
  );

  const pagination = paginateMatches(sorted, filters.page);

  return `
    <section class="dashboard-section" aria-labelledby="fixtures-results-title">
      <div class="section-heading">
        <h2 id="fixtures-results-title">Matches</h2>
        <span role="status">${pagination.total} results</span>
      </div>

      ${renderMatchList(pagination.items)}

      <nav class="fixtures-pagination" aria-label="Match pages">
        <button
          type="button"
          data-fixture-page="${pagination.page - 1}"
          ${pagination.hasPrevious ? '' : 'disabled'}
        >
          Previous
        </button>

        <span>
          Page ${pagination.page} of ${pagination.totalPages}
        </span>

        <button
          type="button"
          data-fixture-page="${pagination.page + 1}"
          ${pagination.hasNext ? '' : 'disabled'}
        >
          Next
        </button>
      </nav>
    </section>
  `;
}

export function renderFixturesPage(matches, filters = {}) {
  const current = {
    status: filters.status ?? 'all',
    search: filters.search ?? '',
    date: filters.date ?? '',
    page: filters.page ?? 1,
  };

  return `
    <div class="dashboard-page fixtures-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / MATCHES</p>
        <h1>Fixtures & Results</h1>
        <p>Browse available football fixtures and historical results.</p>
      </header>

      ${renderFilters(current)}

      <div data-fixture-results>
        ${renderResults(matches, current)}
      </div>
    </div>
  `;
}

export async function mountFixtures(container) {
  const controller = new AbortController();

  let active = true;
  let matches = [];
  let filters = {
    status: 'all',
    search: '',
    date: '',
    page: 1,
  };

  function updateResults() {
    if (!active) return;

    const results = container.querySelector('[data-fixture-results]');

    if (results) {
      results.innerHTML = renderResults(matches, filters);
    }
  }

  function handleInput(event) {
    if (event.target.matches('[data-fixture-search]')) {
      filters.search = event.target.value;
      filters.page = 1;
      updateResults();
    }

    if (event.target.matches('[data-fixture-date]')) {
      filters.date = event.target.value;
      filters.page = 1;
      updateResults();
    }
  }

  function handleChange(event) {
    if (event.target.matches('[data-fixture-status]')) {
      filters.status = event.target.value;
      filters.page = 1;
      updateResults();
    }
  }

  function handleClick(event) {
    const pageButton = event.target.closest?.('[data-fixture-page]');

    if (pageButton && !pageButton.disabled) {
      filters.page = Number(pageButton.dataset.fixturePage);
      updateResults();
      return;
    }

    if (event.target.closest?.('[data-fixture-reset]')) {
      filters = {
        status: 'all',
        search: '',
        date: '',
        page: 1,
      };

      container.innerHTML = renderFixturesPage(matches, filters);
    }
  }

  container.addEventListener('input', handleInput);
  container.addEventListener('change', handleChange);
  container.addEventListener('click', handleClick);

  async function load() {
    container.innerHTML = renderLoading('Loading fixtures and results...');

    try {
      const result = await footballApi.getMatches({
        signal: controller.signal,
      });

      if (!Array.isArray(result)) {
        throw new Error('Unexpected matches API response.');
      }

      if (!active) return;

      matches = result;
      container.innerHTML = renderFixturesPage(matches, filters);
    } catch (error) {
      if (!active || error.name === 'AbortError') return;

      container.innerHTML = `
        ${renderError(error.message)}
        <button type="button" data-fixture-retry>Try again</button>
      `;
    }
  }

  await load();

  return () => {
    active = false;
    controller.abort();
    container.removeEventListener('input', handleInput);
    container.removeEventListener('change', handleChange);
    container.removeEventListener('click', handleClick);
  };
}