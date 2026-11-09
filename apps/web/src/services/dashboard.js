import { footballApi } from './football.js';
import { getMatchState } from '../utils/matches.js';

export async function loadDashboardData(options = {}) {
  const [matches, competitions, seasons] = await Promise.all([
    footballApi.getMatches(options),
    footballApi.getCompetitions(options),
    footballApi.getSeasons(options),
  ]);

  if (
    !Array.isArray(matches) ||
    !Array.isArray(competitions) ||
    !Array.isArray(seasons)
  ) {
    throw new Error('Unexpected dashboard API response.');
  }

  const selectedSeason = [...seasons]
    .filter(season => season?.publicId)
    .sort((a, b) =>
      new Date(b.startDate ?? 0) - new Date(a.startDate ?? 0)
    )[0] ?? null;

  let standings = null;
  let standingsError = null;

  if (selectedSeason) {
    try {
      standings = await footballApi.getStandings(
        selectedSeason.publicId,
        options
      );
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      standingsError = error.message;
    }
  }

  const seasonMatches = selectedSeason
    ? matches.filter(match =>
        match.season?.publicId === selectedSeason.publicId
      )
    : matches;

  const sortedMatches = [...seasonMatches].sort((a, b) =>
    new Date(b.scheduledStart ?? 0) -
    new Date(a.scheduledStart ?? 0)
  );

  return {
    competitions,
    seasons,
    selectedSeason,
    standings,
    standingsError,
    matches: sortedMatches,
    summary: {
      total: seasonMatches.length,
      finished: seasonMatches.filter(
        match => getMatchState(match) === 'finished'
      ).length,
      live: seasonMatches.filter(
        match => getMatchState(match) === 'live'
      ).length,
      scheduled: seasonMatches.filter(
        match => getMatchState(match) === 'scheduled'
      ).length,
    },
  };
}