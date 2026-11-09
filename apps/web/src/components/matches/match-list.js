import { renderMatchCard } from './match-card.js';
import { renderEmpty } from '../../utils/html.js';
import { getMatchState } from '../../utils/matches.js';

export function filterMatches(matches, filter = 'all') {
  if (!Array.isArray(matches)) {
    return [];
  }

  if (filter === 'all') {
    return matches;
  }

  return matches.filter(
    match => getMatchState(match) === filter
  );
}

export function renderMatchList(matches, options = {}) {
  const {
    filter = 'all',
    limit = null,
  } = options;

  const filtered = filterMatches(matches, filter);

  const visible = Number.isInteger(limit) && limit >= 0
    ? filtered.slice(0, limit)
    : filtered;

  if (visible.length === 0) {
    return renderEmpty(
      filter === 'live'
        ? 'No live matches are currently available.'
        : 'No matches found for this selection.'
    );
  }

  return `
    <div class="match-list">
      ${visible.map(renderMatchCard).join('')}
    </div>
  `;
}