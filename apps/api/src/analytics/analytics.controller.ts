
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

type Performance = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

function emptyPerformance(): Performance {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function recordResult(
  stats: Performance,
  goalsFor: number,
  goalsAgainst: number,
): 'W' | 'D' | 'L' {
  stats.played++;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  stats.goalDifference =
    stats.goalsFor - stats.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    stats.won++;
    stats.points += 3;
    return 'W';
  }

  if (goalsFor < goalsAgainst) {
    stats.lost++;
    return 'L';
  }

  stats.drawn++;
  stats.points++;
  return 'D';
}

@Controller('seasons')
export class AnalyticsController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id/analytics/teams')
  async getTeamAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const season = await this.prisma.season.findUnique({
      where: {
        publicId: id,
      },
      include: {
        seasonTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(
        'Season not found',
      );
    }

    const matches = await this.prisma.match.findMany({
      where: {
        seasonId: season.id,
        status: 'finished',
      },
      orderBy: [
        { scheduledStart: 'asc' },
        { id: 'asc' },
      ],
    });

    const rows = season.seasonTeams.map(entry => ({
      team: {
        publicId: entry.team.publicId,
        name: entry.team.name,
      },
      overall: emptyPerformance(),
      home: emptyPerformance(),
      away: emptyPerformance(),
      recentForm: [] as Array<'W' | 'D' | 'L'>,
    }));

    const byId = new Map(
      season.seasonTeams.map((entry, index) => [
        entry.teamId,
        rows[index],
      ]),
    );

    for (const match of matches) {
      const home = byId.get(match.homeTeamId);
      const away = byId.get(match.awayTeamId);

      if (!home || !away) {
        continue;
      }

      const homeResult = recordResult(
        home.overall,
        match.homeScore,
        match.awayScore,
      );

      recordResult(
        home.home,
        match.homeScore,
        match.awayScore,
      );

      const awayResult = recordResult(
        away.overall,
        match.awayScore,
        match.homeScore,
      );

      recordResult(
        away.away,
        match.awayScore,
        match.homeScore,
      );

      home.recentForm.push(homeResult);
      away.recentForm.push(awayResult);

      if (home.recentForm.length > 5) {
        home.recentForm.shift();
      }

      if (away.recentForm.length > 5) {
        away.recentForm.shift();
      }
    }

    rows.sort(
      (a, b) =>
        b.overall.points - a.overall.points ||
        b.overall.goalDifference -
          a.overall.goalDifference ||
        b.overall.goalsFor -
          a.overall.goalsFor ||
        a.team.name.localeCompare(b.team.name),
    );

    return {
      season: {
        publicId: season.publicId,
        name: season.name,
      },
      totalFinishedMatches: matches.length,
      teams: rows.map((row, index) => ({
        position: index + 1,
        ...row,
      })),
    };
  }
}
