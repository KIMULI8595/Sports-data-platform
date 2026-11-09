import { footballApi } from '../services/football.js';
import { getFavorites } from '../services/favorites.js';
import { escapeHtml } from '../utils/html.js';
import { renderFavoriteButton } from '../components/favorites/favorite-button.js';

export function renderFavoritesPage(teams = [], matches = [], state = {}) {
  const saved = getFavorites();

  const teamsById = new Map(
    teams.map(team => [String(team.publicId), team])
  );

  const matchesById = new Map(
    matches.map(match => [String(match.publicId), match])
  );

  const selectedTeams = saved.teams
    .map(id => teamsById.get(id))
    .filter(Boolean);

  const selectedMatches = saved.matches
    .map(id => matchesById.get(id))
    .filter(Boolean);

  const missing = saved.teams.length + saved.matches.length -
    selectedTeams.length - selectedMatches.length;

  const total = saved.teams.length + saved.matches.length;

  const teamItems = selectedTeams.map(team => `
    <article class="favorites-item">
      <div class="favorites-item-info">
        ${/^https:\/\//i.test(team.logoUrl ?? '')
          ? `<img src="${escapeHtml(team.logoUrl)}" alt="" loading="lazy">`
          : '<span class="favorites-placeholder" aria-hidden="true">⚽</span>'}
        <strong>${escapeHtml(team.name ?? 'Unknown club')}</strong>
      </div>
      ${renderFavoriteButton('team', team, { showLabel: true })}
    </article>
  `).join('');

  const matchItems = selectedMatches.map(match => `
    <article class="favorites-item">
      <div class="favorites-item-info">
        <a data-link href="/matches/${encodeURIComponent(match.publicId)}">
          ${escapeHtml(match.homeTeam?.name ?? 'Home')}
          <span class="favorites-score">
            ${match.homeScore ?? '—'} : ${match.awayScore ?? '—'}
          </span>
          ${escapeHtml(match.awayTeam?.name ?? 'Away')}
        </a>
        <small>${escapeHtml(match.status ?? 'Status unavailable')}</small>
      </div>
      ${renderFavoriteButton('match', match, { showLabel: true })}
    </article>
  `).join('');

  return `
    <div class="dashboard-page favorites-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / PERSONAL</p>
        <h1>My Favorites</h1>
        <p>Keep track of your preferred clubs and matches.</p>
      </header>

      <section class="dashboard-section">
        <div class="section-heading">
          <h2>Saved Items</h2>
          <span>${total} saved</span>
        </div>

        ${state.loading
          ? '<p role="status">Loading saved items...</p>'
          : state.error
            ? `<p role="alert">${escapeHtml(state.error)}</p>`
            : total === 0
              ? `<div class="favorites-empty" role="status">
                   <div class="favorites-empty-icon" aria-hidden="true">☆</div>
                   <h2>No favorites saved yet</h2>
                   <p>Use the star controls on Teams or Fixtures & Results to save items here.</p>
                   <div class="favorites-empty-links">
                     <a data-link href="/teams">Browse Teams</a>
                     <a data-link href="/fixtures">Browse Fixtures</a>
                   </div>
                 </div>`
              : `
                <div class="favorites-sections">
                  <section>
                    <h2>Favorite Teams (${saved.teams.length})</h2>
                    <div class="favorites-list">
                      ${teamItems || '<p>No saved teams.</p>'}
                    </div>
                  </section>
                  <section>
                    <h2>Favorite Matches (${saved.matches.length})</h2>
                    <div class="favorites-list">
                      ${matchItems || '<p>No saved matches.</p>'}
                    </div>
                  </section>
                </div>
                ${missing
                  ? `<p class="favorites-warning">
                       ${missing} saved item(s) are not available in the current API dataset.
                     </p>`
                  : ''}`}
      </section>

      <p class="favorites-note">
        Favorites are stored in this browser only.
        They are not synchronized across devices.
      </p>
    </div>
  `;
}

export function mountFavorites(container) {
  const controller = new AbortController();
  let active = true;
  let teams = [];
  let matches = [];
  let loading = true;
  let error = null;

  function render() {
    if (!active) return;
    container.innerHTML = renderFavoritesPage(teams, matches, {
      loading,
      error,
    });
  }

  function handleFavoritesChanged() {
    render();
  }

  window.addEventListener(
    'sportpulse:favorites-changed',
    handleFavoritesChanged
  );

  render();

  Promise.all([
    footballApi.getTeams({ signal: controller.signal }),
    footballApi.getMatches({ signal: controller.signal }),
  ]).then(([teamResponse, matchResponse]) => {
    if (!active) return;

    teams = Array.isArray(teamResponse)
      ? teamResponse
      : teamResponse?.value ?? teamResponse?.teams ?? [];

    matches = Array.isArray(matchResponse) ? matchResponse : [];

    if (!Array.isArray(teams) || !Array.isArray(matches)) {
      throw new Error('Unexpected favorites API response.');
    }

    loading = false;
    render();
  }).catch(caught => {
    if (!active || caught.name === 'AbortError') return;

    loading = false;
    error = caught.message || 'Unable to load saved items.';
    render();
  });

  return () => {
    active = false;
    controller.abort();
    window.removeEventListener(
      'sportpulse:favorites-changed',
      handleFavoritesChanged
    );
  };
}
