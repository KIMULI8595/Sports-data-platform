import { footballApi } from '../services/football.js';
import { renderMatchDetails } from '../components/matches/match-details.js';
import { renderError, renderLoading } from '../utils/html.js';

export async function mountMatchCenter(container, matchId) {
  const controller = new AbortController();
  let active = true;

  const handleRetry = event => {
    if (event.target.closest?.('[data-match-retry]')) {
      void load();
    }
  };

  async function load() {
    if (!active) return;

    container.innerHTML = renderLoading('Loading match details...');

    try {
      const details = await footballApi.getMatchDetails(matchId, {
        signal: controller.signal,
      });

      if (active) {
        container.innerHTML = renderMatchDetails(details);
      }
    } catch (error) {
      if (!active || error.name === 'AbortError') return;

      container.innerHTML = `
        ${renderError(error.message)}
        <button type="button" data-match-retry>
          Try again
        </button>
      `;
    }
  }

  container.addEventListener('click', handleRetry);

  await load();

  return () => {
    active = false;
    controller.abort();
    container.removeEventListener('click', handleRetry);
  };
}