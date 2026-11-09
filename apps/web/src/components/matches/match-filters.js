import { getMatchState } from '../../utils/matches.js';

export const PAGE_SIZE = 20;

export function filterFixtureMatches(matches, filters = {}) {
  if (!Array.isArray(matches)) return [];

  const status = filters.status ?? 'all';
  const search = String(filters.search ?? '').trim().toLowerCase();
  const date = filters.date ?? '';

  return matches.filter(match => {
    if (status !== 'all' && getMatchState(match) !== status) {
      return false;
    }

    if (search) {
      const home = String(match.homeTeam?.name ?? '').toLowerCase();
      const away = String(match.awayTeam?.name ?? '').toLowerCase();

      if (!home.includes(search) && !away.includes(search)) {
        return false;
      }
    }

    if (date) {
      const scheduled = match.scheduledStart;

      if (!scheduled || Number.isNaN(Date.parse(scheduled))) {
        return false;
      }

      const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Kampala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(scheduled));

      if (localDate !== date) return false;
    }

    return true;
  });
}

export function paginateMatches(matches, page = 1, pageSize = PAGE_SIZE) {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0
    ? pageSize
    : PAGE_SIZE;

  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const requestedPage = Number.isInteger(page) ? page : 1;
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const start = (currentPage - 1) * safePageSize;

  return {
    items: matches.slice(start, start + safePageSize),
    page: currentPage,
    pageSize: safePageSize,
    total,
    totalPages,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}