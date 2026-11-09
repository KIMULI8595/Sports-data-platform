import { footballApi } from '../services/football.js';
import {
  renderError,
  renderLoading,
} from '../utils/html.js';
import {
  calculateLeagueStats,
  renderStatCard,
} from '../components/analytics/stat-card.js';
import {
  renderTeamRankings,
  renderVenueComparison,
  renderRankingSelector,
} from '../components/analytics/team-rankings.js';

export const ANALYTICS_SEASON_ID =
  'f46e44cf-e0de-437a-96f2-3e5c66134777';

export function renderAnalyticsPage(
  matches,
  standings,
  teamAnalytics,
  metric = 'points'
) {
  const stats = calculateLeagueStats(
    matches,
    ANALYTICS_SEASON_ID
  );

  const teams = teamAnalytics.teams ?? [];
  const outcomeTotal =
    stats.homeWins + stats.draws + stats.awayWins;

  const percentage = value => outcomeTotal
    ? ((value / outcomeTotal) * 100).toFixed(1)
    : '0.0';

  return `
    <div class="dashboard-page analytics-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / INSIGHTS</p>
        <h1>Statistics & Analytics</h1>
        <p>
          Uganda Premier League — 2024/25 season.
          Historical results and verified club performance.
        </p>
      </header>

      <section class="analytics-kpi-grid" aria-label="Season statistics">
        ${renderStatCard(
          'Finished Matches',
          stats.matches,
          'Completed fixtures'
        )}
        ${renderStatCard(
          'Total Goals',
          stats.goals,
          'Home and away combined'
        )}
        ${renderStatCard(
          'Goals per Match',
          stats.goalsPerMatch,
          'Season scoring average'
        )}
        ${renderStatCard(
          'Clubs',
          standings.length,
          'Teams in league standings'
        )}
      </section>

      <div class="analytics-content-grid">
        <section class="dashboard-section analytics-panel">
          <div class="section-heading">
            <h2>Match Outcomes</h2>
            <span>${stats.matches} finished matches</span>
          </div>

          <div class="analytics-outcomes">
            <div class="analytics-outcome">
              <span>Home wins</span>
              <strong>${stats.homeWins}</strong>
              <small>${percentage(stats.homeWins)}%</small>
            </div>
            <div class="analytics-outcome">
              <span>Draws</span>
              <strong>${stats.draws}</strong>
              <small>${percentage(stats.draws)}%</small>
            </div>
            <div class="analytics-outcome">
              <span>Away wins</span>
              <strong>${stats.awayWins}</strong>
              <small>${percentage(stats.awayWins)}%</small>
            </div>
          </div>

          <div class="analytics-outcome-bar"
            role="img"
            aria-label="Home wins ${stats.homeWins}, draws ${stats.draws}, away wins ${stats.awayWins}">
            <span class="home"
              style="width:${percentage(stats.homeWins)}%"></span>
            <span class="draw"
              style="width:${percentage(stats.draws)}%"></span>
            <span class="away"
              style="width:${percentage(stats.awayWins)}%"></span>
          </div>

          <div class="analytics-goals-summary">
            <div>
              <span>Home goals</span>
              <strong>${stats.homeGoals}</strong>
            </div>
            <div>
              <span>Away goals</span>
              <strong>${stats.awayGoals}</strong>
            </div>
          </div>
        </section>

        <section class="dashboard-section analytics-panel">
          <div class="section-heading">
            <h2>Club Rankings</h2>
          </div>

          ${renderRankingSelector(metric)}

          <div data-analytics-rankings>
            ${renderTeamRankings(teams, metric)}
          </div>
        </section>
      </div>

      <section class="dashboard-section analytics-panel">
        <div class="section-heading">
          <h2>Home vs Away Performance</h2>
          <span>All ${teams.length} clubs</span>
        </div>
        ${renderVenueComparison(teams)}
      </section>

      <p class="analytics-footnote">
        Source: SPORTPULSE historical match results and season
        team analytics. No live match data is implied.
      </p>
    </div>
  `;
}

export async function mountAnalytics(container) {
  const controller = new AbortController();
  let active = true;
  let metric = 'points';
  let matches = [];
  let standings = [];
  let teamAnalytics = { teams: [] };

  function handleChange(event) {
    if (!event.target.matches('[data-analytics-metric]')) return;

    metric = event.target.value;

    const output = container.querySelector(
      '[data-analytics-rankings]'
    );

    if (output) {
      output.innerHTML = renderTeamRankings(
        teamAnalytics.teams,
        metric
      );
    }
  }

  container.addEventListener('change', handleChange);
  container.innerHTML = renderLoading('Loading season analytics...');

  try {
    const responses = await Promise.all([
      footballApi.getMatches({
        signal: controller.signal,
      }),
      footballApi.getStandings(ANALYTICS_SEASON_ID, {
        signal: controller.signal,
      }),
      footballApi.getTeamAnalytics(ANALYTICS_SEASON_ID, {
        signal: controller.signal,
      }),
    ]);

    if (!active) return;

    [matches, standings, teamAnalytics] = responses;

    if (
      !Array.isArray(matches) ||
      !Array.isArray(standings) ||
      !Array.isArray(teamAnalytics?.teams)
    ) {
      throw new Error('Unexpected analytics API response.');
    }

    container.innerHTML = renderAnalyticsPage(
      matches,
      standings,
      teamAnalytics,
      metric
    );
  } catch (error) {
    if (active && error.name !== 'AbortError') {
      container.innerHTML = renderError(error.message);
    }
  }

  return () => {
    active = false;
    controller.abort();
    container.removeEventListener('change', handleChange);
  };
}
