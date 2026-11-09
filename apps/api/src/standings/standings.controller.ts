import { Controller, Get, Param, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
@Controller('seasons') export class StandingsController {
 constructor(private readonly prisma: PrismaService) {}
 @Get(':id/standings') async get(@Param('id', ParseUUIDPipe) id: string) {
  const season = await this.prisma.season.findUnique({ where: { publicId: id }, include: { seasonTeams: { include: { team: true } } } });
  if (!season) throw new NotFoundException('Season not found');
  const matches = await this.prisma.match.findMany({ where: { seasonId: season.id, status: 'finished' } });
  const rows = season.seasonTeams.map(entry => ({ team: { publicId: entry.team.publicId, name: entry.team.name }, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
  const byId = new Map(season.seasonTeams.map((entry, i) => [entry.teamId, rows[i]]));
  for (const m of matches) {
   const home = byId.get(m.homeTeamId), away = byId.get(m.awayTeamId);
   if (!home || !away) continue;
   home.played++; away.played++; home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore; away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;
   if (m.homeScore > m.awayScore) { home.won++; home.points += 3; away.lost++; }
   else if (m.homeScore < m.awayScore) { away.won++; away.points += 3; home.lost++; }
   else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  for (const row of rows) row.goalDifference = row.goalsFor - row.goalsAgainst;
  return rows.sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor || a.team.name.localeCompare(b.team.name)).map((r,i) => ({ position: i+1, ...r }));
 }
}
