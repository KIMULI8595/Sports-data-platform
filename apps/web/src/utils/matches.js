const LIVE_STATUSES = new Set([
  'live', 'in_progress', 'first_half',
  'second_half', 'halftime', 'extra_time',
  'penalties'
]);

const FINISHED_STATUSES = new Set([
  'finished', 'completed', 'after_extra_time',
  'after_penalties'
]);

const SCHEDULED_STATUSES = new Set([
  'scheduled', 'not_started', 'upcoming'
]);

export function getMatchState(match) {
  const status = String(match?.status ?? '').toLowerCase();

  if (LIVE_STATUSES.has(status)) return 'live';
  if (FINISHED_STATUSES.has(status)) return 'finished';
  if (SCHEDULED_STATUSES.has(status)) return 'scheduled';

  return 'other';
}

export function normalizeMatch(match) {
  if (!match || typeof match !== 'object') {
    throw new TypeError('A match object is required.');
  }

  return {
    id: match.publicId ?? null,
    homeTeam: match.homeTeam?.name ?? 'Unknown team',
    awayTeam: match.awayTeam?.name ?? 'Unknown team',
    homeLogo: match.homeTeam?.logoUrl ?? null,
    awayLogo: match.awayTeam?.logoUrl ?? null,
    homeScore: Number.isInteger(match.homeScore)
      ? match.homeScore : null,
    awayScore: Number.isInteger(match.awayScore)
      ? match.awayScore : null,
    status: String(match.status ?? 'unknown'),
    state: getMatchState(match),
    scheduledStart: match.scheduledStart ?? null,
    competition: match.season?.competition?.name ?? null,
    season: match.season?.name ?? null,
  };
}

export function formatMatchDate(value, options = {}) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat(
    options.locale || 'en-UG',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: options.timeZone || 'Africa/Kampala',
    }
  ).format(date);
}