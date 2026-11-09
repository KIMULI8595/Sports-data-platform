import { footballApi } from '../services/football.js';
import { escapeHtml, renderError, renderLoading } from '../utils/html.js';
import { renderPlayerCard } from '../components/players/player-card.js';
import { filterPlayers } from '../components/players/player-filters.js';

export function extractPlayers(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.players)) return response.players;
  return [];
}

export function renderPlayersPage(players, state = {}) {
  const search = state.search ?? '';
  const position = state.position ?? 'all';

  const visible = filterPlayers(players, { search, position });

  const positions = [...new Set(
    players.map(player => player.position).filter(Boolean)
  )].sort();

  return `
    <div class="dashboard-page players-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / PLAYERS</p>
        <h1>Players</h1>
        <p>Explore player profiles and club information.</p>
      </header>

      ${players.length ? `
        <section class="dashboard-section">
          <div class="section-heading">
            <h2>Player Directory</h2>
            <span>${visible.length} of ${players.length} players</span>
          </div>

          <div class="player-controls">
            <label>
              Search players
              <input type="search" data-player-search
                placeholder="Search player or club"
                value="${escapeHtml(search)}">
            </label>

            <label>
              Position
              <select data-player-position>
                <option value="all">All positions</option>
                ${positions.map(value => `
                  <option value="${escapeHtml(value)}"
                    ${position === value ? 'selected' : ''}>
                    ${escapeHtml(value)}
                  </option>
                `).join('')}
              </select>
            </label>
          </div>

          <div class="players-grid" data-player-grid>
            ${visible.length
              ? visible.map(renderPlayerCard).join('')
              : '<p>No players match your filters.</p>'}
          </div>
        </section>
      ` : `
        <section class="dashboard-section player-empty-state">
          <div class="player-empty-icon" aria-hidden="true">♙</div>
          <h2>No player records available</h2>
          <p>
            Player profiles will appear here when verified
            player data becomes available.
          </p>
          <p class="player-empty-note">
            Club standings, fixtures, and team analytics remain available.
          </p>
        </section>
      `}
    </div>
  `;
}

export async function mountPlayers(container) {
  const controller = new AbortController();
  let active = true;
  let players = [];

  const state = {
    search: '',
    position: 'all',
  };

  function render() {
    if (active) {
      container.innerHTML = renderPlayersPage(players, state);
    }
  }

  function handleInput(event) {
    if (!event.target.matches('[data-player-search]')) return;

    const cursor = event.target.selectionStart;
    state.search = event.target.value;
    render();

    const replacement = container.querySelector('[data-player-search]');
    replacement?.focus();

    if (cursor != null) {
      replacement?.setSelectionRange(cursor, cursor);
    }
  }

  function handleChange(event) {
    if (!event.target.matches('[data-player-position]')) return;
    state.position = event.target.value;
    render();
  }

  container.addEventListener('input', handleInput);
  container.addEventListener('change', handleChange);

  container.innerHTML = renderLoading('Loading players...');

  try {
    const response = await footballApi.getPlayers({
      signal: controller.signal,
    });

    if (!active) return;

    players = extractPlayers(response);
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
  };
}
