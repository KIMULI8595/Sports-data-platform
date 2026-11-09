import { apiGet } from './api.js';

function encodeId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new TypeError('A valid identifier is required.');
  }

  return encodeURIComponent(id);
}

export const footballApi = {
  getMatches(options = {}) {
    return apiGet('/matches', options);
  },

  getTeams(options = {}) {
    return apiGet('/teams', options);
  },

  getPlayers(options = {}) {
    return apiGet('/players', options);
  },

  getCompetitions(options = {}) {
    return apiGet('/competitions', options);
  },

  getSeasons(options = {}) {
    return apiGet('/seasons', options);
  },

  getStandings(seasonId, options = {}) {
    return apiGet(
      `/seasons/${encodeId(seasonId)}/standings`,
      options
    );
  },

  getTeamAnalytics(seasonId, options = {}) {
    return apiGet(
      `/seasons/${encodeId(seasonId)}/analytics/teams`,
      options
    );
  },

  getMatchDetails(matchId, options = {}) {
    return apiGet(
      `/matches/${encodeId(matchId)}/details`,
      options
    );
  },
};