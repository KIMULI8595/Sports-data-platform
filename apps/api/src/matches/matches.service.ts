import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { CreateMatchDto } from './dto/create-match.dto.js';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMatchDto: CreateMatchDto) {
    const season = await this.prisma.season.findUnique({
      where: {
        publicId: createMatchDto.seasonPublicId,
      },
      include: {
        competition: true,
        seasonTeams: true,
      },
    });

    if (!season) {
      throw new NotFoundException('Season not found.');
    }

    const homeTeam = await this.prisma.team.findUnique({
      where: {
        publicId: createMatchDto.homeTeamPublicId,
      },
    });

    if (!homeTeam) {
      throw new NotFoundException('Home team not found.');
    }

    const awayTeam = await this.prisma.team.findUnique({
      where: {
        publicId: createMatchDto.awayTeamPublicId,
      },
    });

    if (!awayTeam) {
      throw new NotFoundException('Away team not found.');
    }

    if (homeTeam.id === awayTeam.id) {
      throw new BadRequestException(
        'Home team and away team must be different.',
      );
    }

    const registeredTeamIds = new Set(
      season.seasonTeams.map(
        (seasonTeam) => seasonTeam.teamId,
      ),
    );

    if (!registeredTeamIds.has(homeTeam.id)) {
      throw new BadRequestException(
        'Home team is not registered in this season.',
      );
    }

    if (!registeredTeamIds.has(awayTeam.id)) {
      throw new BadRequestException(
        'Away team is not registered in this season.',
      );
    }

    if (
      homeTeam.sportId !== season.competition.sportId ||
      awayTeam.sportId !== season.competition.sportId
    ) {
      throw new BadRequestException(
        'Both teams must belong to the same sport as the competition.',
      );
    }

    return this.prisma.match.create({
      data: {
        seasonId: season.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        scheduledStart: new Date(
          createMatchDto.scheduledStart,
        ),
      },
      include: {
        season: {
          include: {
            competition: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
      },
    });
  }

  async findAll() {
    return this.prisma.match.findMany({
      include: {
        season: {
          include: {
            competition: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        scheduledStart: 'asc',
      },
    });
  }

  async start(matchPublicId: string) {
    await this.ensureMatchExists(matchPublicId);

    const result = await this.prisma.match.updateMany({
      where: {
        publicId: matchPublicId,
        status: 'scheduled',
      },
      data: {
        status: 'live',
        period: 'first_half',
        actualStart: new Date(),
        actualEnd: null,
        clockSeconds: 0,
      },
    });

    if (result.count === 0) {
      await this.throwInvalidTransition(
        matchPublicId,
        'Only a scheduled match can be started.',
      );
    }

    return this.findByPublicId(matchPublicId);
  }

  async halfTime(matchPublicId: string) {
    await this.ensureMatchExists(matchPublicId);

    const result = await this.prisma.match.updateMany({
      where: {
        publicId: matchPublicId,
        status: 'live',
        period: 'first_half',
      },
      data: {
        status: 'half_time',
        period: 'half_time',
      },
    });

    if (result.count === 0) {
      await this.throwInvalidTransition(
        matchPublicId,
        'Only a live first-half match can enter half-time.',
      );
    }

    return this.findByPublicId(matchPublicId);
  }

  async startSecondHalf(matchPublicId: string) {
    await this.ensureMatchExists(matchPublicId);

    const result = await this.prisma.match.updateMany({
      where: {
        publicId: matchPublicId,
        status: 'half_time',
        period: 'half_time',
      },
      data: {
        status: 'live',
        period: 'second_half',
      },
    });

    if (result.count === 0) {
      await this.throwInvalidTransition(
        matchPublicId,
        'Only a match at half-time can start the second half.',
      );
    }

    return this.findByPublicId(matchPublicId);
  }

  async finish(matchPublicId: string) {
    await this.ensureMatchExists(matchPublicId);

    const result = await this.prisma.match.updateMany({
      where: {
        publicId: matchPublicId,
        status: 'live',
        period: {
          in: [
            'second_half',
            'extra_time',
            'penalties',
          ],
        },
      },
      data: {
        status: 'finished',
        actualEnd: new Date(),
      },
    });

    if (result.count === 0) {
      await this.throwInvalidTransition(
        matchPublicId,
        'Only a live match in its final playing period can be finished.',
      );
    }

    return this.findByPublicId(matchPublicId);
  }

  private async ensureMatchExists(
    matchPublicId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: {
        publicId: matchPublicId,
      },
      select: {
        id: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }
  }

  private async throwInvalidTransition(
    matchPublicId: string,
    message: string,
  ): Promise<never> {
    const match = await this.prisma.match.findUnique({
      where: {
        publicId: matchPublicId,
      },
      select: {
        status: true,
        period: true,
      },
    });

    throw new BadRequestException({
      message,
      currentState: {
        status: match?.status ?? null,
        period: match?.period ?? null,
      },
    });
  }

  private async findByPublicId(
    matchPublicId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: {
        publicId: matchPublicId,
      },
      include: {
        season: {
          include: {
            competition: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    return match;
  }
}