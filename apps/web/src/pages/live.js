import { footballApi } from '../services/football.js';
import { escapeHtml } from '../utils/html.js';
import { renderLiveMatchCard } from '../components/live/live-match-card.js';
import { filterLiveMatches } from '../components/live/live-filters.js';

export function renderLivePage(matches, state = {}) {
  const live = filterLiveMatches(matches);
  const loading = Boolean(state.loading);
  const error = state.error ?? null;
  const lastUpdated = state.lastUpdated ?? null;

  let content;

  if (loading) {
    content = `
      <div class="live-message" role="status">
        <div class="live-message-icon" aria-hidden="true">◷</div>
        <h2>Checking live scores</h2>
        <p>Loading the latest match statuses from SPORTPULSE.</p>
      </div>`;
  } else if (error) {
    content = `
      <div class="live-message" role="alert">
        <div class="live-message-icon" aria-hidden="true">!</div>
        <h2>Unable to load live scores</h2>
        <p>${escapeHtml(error)}</p>
        <p>Use Refresh Scores to try again.</p>
      </div>`;
  } else if (!live.length) {
    content = `
      <div class="live-message" role="status">
        <div class="live-message-icon" aria-hidden="true">◷</div>
        <h2>No live matches currently available</h2>
        <p>
          There are no in-progress matches in the current
          SPORTPULSE data.
        </p>
        <p class="live-message-note">
          Completed matches remain available under Fixtures & Results.
        </p>
        <a class="live-secondary-link" data-link href="/fixtures">
          View Fixtures & Results
        </a>
      </div>`;
  } else {
    content = `
      <div class="live-matches-grid">
        ${live.map(renderLiveMatchCard).join('')}
      </div>`;
  }

  return `
    <div class="dashboard-page live-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / MATCH CENTER</p>
        <h1>Live Scores</h1>
        <p>In-progress football matches from the SPORTPULSE API.</p>
      </header>

      <section class="dashboard-section">
        <div class="live-toolbar">
          <div class="live-toolbar-summary">
            <span class="live-count">${live.length} LIVE</span>
            <span class="live-update-time">
              ${lastUpdated
                ? `Last checked: ${escapeHtml(lastUpdated)}`
                : 'Not yet checked'}
            </span>
          </div>

          <button type="button"
            class="live-refresh-button"
            data-live-refresh
            ${loading ? 'disabled' : ''}>
            ${loading ? 'Checking...' : 'Refresh Scores'}
          </button>
        </div>

        <div data-live-content aria-live="polite">
          ${content}
        </div>
      </section>

      <p class="live-disclaimer">
        Scores reflect records currently stored in SPORTPULSE.
        Refresh checks the existing API; it does not initiate
        an external provider synchronization.
      </p>
    </div>
  `;
}

export function mountLive(container) {
  let active = true;
  let requestVersion = 0;
  let requestController = null;

  let matches = [];
  let loading = false;
  let error = null;
  let lastUpdated = null;

  function render() {
    if (!active) return;

    container.innerHTML = renderLivePage(matches, {
      loading,
      error,
      lastUpdated,
    });
  }

  async function refresh() {
    requestController?.abort();

    const controller = new AbortController();
    requestController = controller;
    const version = ++requestVersion;

    loading = true;
    error = null;
    render();

    try {
      const response = await footballApi.getMatches({
        signal: controller.signal,
      });

      if (!active || version !== requestVersion) return;

      if (!Array.isArray(response)) {
        throw new Error('Unexpected matches API response.');
      }

      matches = response;
      lastUpdated = new Intl.DateTimeFormat('en-UG', {
        timeZone: 'Africa/Kampala',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date());
    } catch (caught) {
      if (!active || version !== requestVersion) return;
      if (caught.name === 'AbortError') return;

      matches = [];
      error = caught.message || 'An unexpected error occurred.';
    } finally {
      if (active && version === requestVersion) {
        loading = false;
        render();
      }
    }
  }

  function handleClick(event) {
    if (!event.target.closest?.('[data-live-refresh]')) return;
    refresh();
  }

  container.addEventListener('click', handleClick);
  refresh();

  return () => {
    active = false;
    requestVersion++;
    requestController?.abort();
    container.removeEventListener('click', handleClick);
  };
}
