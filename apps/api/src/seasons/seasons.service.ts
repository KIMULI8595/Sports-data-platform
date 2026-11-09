import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateSeasonDto } from './dto/create-season.dto.js';
import { AddTeamToSeasonDto } from './dto/add-team-to-season.dto.js';


@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSeasonDto: CreateSeasonDto) {
    const competition = await this.prisma.competition.findUnique({
      where: {
        publicId: createSeasonDto.competitionPublicId,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found.');
    }

    const startDate = new Date(createSeasonDto.startDate);
    const endDate = new Date(createSeasonDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be on or after startDate.',
      );
    }

    try {
      return await this.prisma.season.create({
        data: {
          competitionId: competition.id,
          name: createSeasonDto.name,
          startDate,
          endDate,
          isCurrent: createSeasonDto.isCurrent ?? false,
        },
        include: {
          competition: {
            include: {
              sport: true,
              country: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This competition already has a season with the same name.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.season.findMany({
      include: {
        competition: {
          include: {
            sport: true,
            country: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

    async addTeam(
    seasonPublicId: string,
    addTeamToSeasonDto: AddTeamToSeasonDto,) {
    const season = await this.prisma.season.findUnique({
      where: {
        publicId: seasonPublicId,
      },
      include: {
        competition: true,
      },
    });

    if (!season) {
      throw new NotFoundException('Season not found.');
    }

    const team = await this.prisma.team.findUnique({
      where: {
        publicId: addTeamToSeasonDto.teamPublicId,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    if (team.sportId !== season.competition.sportId) {
      throw new BadRequestException(
        'The team and competition must belong to the same sport.',
      );
    }

    try {
      return await this.prisma.seasonTeam.create({
        data: {
          seasonId: season.id,
          teamId: team.id,
          groupName: addTeamToSeasonDto.groupName,
          seed: addTeamToSeasonDto.seed,
        },

        include: {
          team: {
            include: {
              sport: true,
              country: true,
            },
          },

          season: {
            include: {
              competition: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This team is already registered in this season.',
        );
      }

      throw error;
    }
  }

  async findTeams(seasonPublicId: string) {
    const season = await this.prisma.season.findUnique({
      where: {
        publicId: seasonPublicId,
      },
    });

    if (!season) {
      throw new NotFoundException('Season not found.');
    }

    return this.prisma.seasonTeam.findMany({
      where: {
        seasonId: season.id,
      },

      include: {
        team: {
          include: {
            country: true,
          },
        },
      },

      orderBy: {
        team: {
          name: 'asc',
        },
      },
    });
  }
}