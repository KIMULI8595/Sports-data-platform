import { escapeHtml } from '../../utils/html.js';

export function renderCompetitionCard(competition, seasons = []) {
  const name = competition?.name ?? 'Unnamed competition';
  const shortName = competition?.shortName ?? name;

  const competitionSeasons = seasons.filter(
    season =>
      season.competitionId === competition.id ||
      season.competition?.publicId === competition.publicId
  );

  return `
    <article class="dashboard-section competition-card">
      <p class="page-eyebrow">COMPETITION</p>
      <h2>${escapeHtml(name)}</h2>

      <p class="competition-short-name">
        ${escapeHtml(shortName)}
      </p>

      <p>
        ${competitionSeasons.length}
        season${competitionSeasons.length === 1 ? '' : 's'} available
      </p>
    </article>
  `;
}