import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateTeamDto } from './dto/create-team.dto.js';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    const sport = await this.prisma.sport.findUnique({
      where: {
        publicId: createTeamDto.sportPublicId,
      },
    });

    if (!sport) {
      throw new NotFoundException('Sport not found.');
    }

    let countryId: number | null = null;

    if (createTeamDto.countryPublicId) {
      const country = await this.prisma.country.findUnique({
        where: {
          publicId: createTeamDto.countryPublicId,
        },
      });

      if (!country) {
        throw new NotFoundException('Country not found.');
      }

      countryId = country.id;
    }

    try {
      return await this.prisma.team.create({
        data: {
          sportId: sport.id,
          countryId,
          name: createTeamDto.name,
          shortName: createTeamDto.shortName,
          code: createTeamDto.code,
          slug: createTeamDto.slug,
          teamType: createTeamDto.teamType ?? 'club',
          gender: createTeamDto.gender ?? 'male',
          foundedYear: createTeamDto.foundedYear,
          logoUrl: createTeamDto.logoUrl,
        },
        include: {
          sport: true,
          country: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A team with the same unique information already exists.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        sport: true,
        country: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}