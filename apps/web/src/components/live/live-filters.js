const LIVE_STATUSES = new Set([
  'live',
  'in_progress',
  'inprogress',
  'first_half',
  'second_half',
  'halftime',
  'half_time',
  'extra_time',
  'penalties',
  'penalty_shootout',
  '1h',
  '2h',
  'ht',
  'et',
  'bt',
  'p',
  'int'
]);

export function isLiveMatch(match) {
  if (!match || typeof match !== 'object') return false;

  const status = String(match.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return LIVE_STATUSES.has(status);
}

export function filterLiveMatches(matches) {
  if (!Array.isArray(matches)) return [];

  return matches
    .filter(isLiveMatch)
    .sort((a, b) => {
      const first = Date.parse(a.scheduledStart ?? '');
      const second = Date.parse(b.scheduledStart ?? '');

      return (Number.isFinite(first) ? first : Infinity) -
        (Number.isFinite(second) ? second : Infinity);
    });
}
