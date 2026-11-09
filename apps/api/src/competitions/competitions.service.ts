import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateCompetitionDto } from './dto/create-competition.dto.js';

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompetitionDto: CreateCompetitionDto) {
    const sport = await this.prisma.sport.findUnique({
      where: {
        publicId: createCompetitionDto.sportPublicId,
      },
    });

    if (!sport) {
      throw new NotFoundException('Sport not found.');
    }

    let countryId: number | null = null;

    if (createCompetitionDto.countryPublicId) {
      const country = await this.prisma.country.findUnique({
        where: {
          publicId: createCompetitionDto.countryPublicId,
        },
      });

      if (!country) {
        throw new NotFoundException('Country not found.');
      }

      countryId = country.id;
    }

    try {
      return await this.prisma.competition.create({
        data: {
          sportId: sport.id,
          countryId,
          name: createCompetitionDto.name,
          shortName: createCompetitionDto.shortName,
          slug: createCompetitionDto.slug,
          type: createCompetitionDto.type,
          gender: createCompetitionDto.gender ?? 'male',
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
          'A competition with the same unique information already exists.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.competition.findMany({
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