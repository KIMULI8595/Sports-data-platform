export const DEFAULT_API_URL = 'http://localhost:3000';
const PREFERENCES_KEY = 'sportpulse:preferences:v1';

export function validateApiUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());

    if (url.username || url.password ||
        url.search || url.hash || url.pathname !== '/') {
      return null;
    }

    const loopback = ['localhost', '127.0.0.1', '[::1]']
      .includes(url.hostname);

    if (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && loopback)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function getConfiguredApiUrl() {
  try {
    return globalThis.localStorage?.getItem('sportsApiUrl') || '';
  } catch {
    return '';
  }
}

export function getEffectiveApiUrl() {
  return validateApiUrl(getConfiguredApiUrl()) || DEFAULT_API_URL;
}

export function saveApiUrl(value) {
  const normalized = validateApiUrl(value);
  if (!normalized) return false;

  try {
    globalThis.localStorage?.setItem('sportsApiUrl', normalized);
    return globalThis.localStorage?.getItem('sportsApiUrl') === normalized;
  } catch {
    return false;
  }
}

export function resetApiUrl() {
  try {
    globalThis.localStorage?.removeItem('sportsApiUrl');
    return globalThis.localStorage?.getItem('sportsApiUrl') === null;
  } catch {
    return false;
  }
}

export function getPreferences() {
  const defaults = {
    appearance: 'dark',
    notificationPreference: 'in-app',
  };

  try {
    const raw = globalThis.localStorage?.getItem(PREFERENCES_KEY);
    const value = raw ? JSON.parse(raw) : {};

    if (!value || typeof value !== 'object' ||
        Array.isArray(value)) {
      return defaults;
    }

    return {
      appearance: 'dark',
      notificationPreference:
        value.notificationPreference === 'off'
          ? 'off'
          : 'in-app',
    };
  } catch {
    return defaults;
  }
}

export function saveNotificationPreference(value) {
  if (!['in-app', 'off'].includes(value)) return false;

  try {
    const preferences = {
      ...getPreferences(),
      notificationPreference: value,
    };

    globalThis.localStorage?.setItem(
      PREFERENCES_KEY,
      JSON.stringify(preferences)
    );

    return getPreferences().notificationPreference === value;
  } catch {
    return false;
  }
}

export function getBrowserDataSummary() {
  let favoriteTeams = 0;
  let favoriteMatches = 0;
  let notifications = 0;

  try {
    const favorites = JSON.parse(
      globalThis.localStorage?.getItem('sportpulse:favorites:v1') || '{}'
    );

    favoriteTeams = Array.isArray(favorites.teams)
      ? favorites.teams.length : 0;

    favoriteMatches = Array.isArray(favorites.matches)
      ? favorites.matches.length : 0;
  } catch {}

  try {
    const items = JSON.parse(
      globalThis.localStorage?.getItem('sportpulse:notifications:v1') || '[]'
    );

    notifications = Array.isArray(items) ? items.length : 0;
  } catch {}

  return { favoriteTeams, favoriteMatches, notifications };
}
