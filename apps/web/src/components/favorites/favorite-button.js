import { escapeHtml } from '../../utils/html.js';
import { isFavorite } from '../../services/favorites.js';

export function renderFavoriteButton(type, entity, options = {}) {
  const id = String(entity?.publicId ?? entity?.id ?? '');
  if (!id || !['team', 'match'].includes(type)) return '';

  const saved = isFavorite(type, id);
  const label = saved ? 'Remove from favorites' : 'Add to favorites';

  return `
    <button type="button"
      class="favorite-toggle ${saved ? 'is-saved' : ''}"
      data-favorite-type="${escapeHtml(type)}"
      data-favorite-id="${escapeHtml(id)}"
      aria-pressed="${saved}"
      aria-label="${label}"
      title="${label}">
      <span aria-hidden="true">${saved ? '★' : '☆'}</span>
      ${options.showLabel
        ? `<span>${saved ? 'Saved' : 'Save'}</span>`
        : ''}
    </button>
  `;
}
