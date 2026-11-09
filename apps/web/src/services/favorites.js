const STORAGE_KEY = 'sportpulse:favorites:v1';
const TYPES = { team: 'teams', match: 'matches' };

function emptyFavorites() {
  return { teams: [], matches: [] };
}

function normalize(data) {
  const result = emptyFavorites();

  for (const key of Object.values(TYPES)) {
    if (!Array.isArray(data?.[key])) continue;

    result[key] = [...new Set(
      data[key].filter(id => typeof id === 'string' && id.trim())
    )];
  }

  return result;
}

export function getFavorites() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyFavorites();
  } catch {
    return emptyFavorites();
  }
}

export function isFavorite(type, id) {
  const key = TYPES[type];
  return Boolean(key && id && getFavorites()[key].includes(String(id)));
}

export function toggleFavorite(type, id) {
  const key = TYPES[type];
  const identifier = String(id ?? '').trim();

  if (!key || !identifier) {
    throw new TypeError('A valid favorite type and ID are required.');
  }

  const favorites = getFavorites();
  const saved = favorites[key].includes(identifier);

  favorites[key] = saved
    ? favorites[key].filter(value => value !== identifier)
    : [...favorites[key], identifier];

  try {
    if (!globalThis.localStorage) return null;
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(favorites)
    );
    return !saved;
  } catch {
    return null;
  }
}

export function countFavorites() {
  const favorites = getFavorites();
  return favorites.teams.length + favorites.matches.length;
}
