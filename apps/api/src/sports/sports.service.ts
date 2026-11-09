import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateSportDto } from './dto/create-sport.dto.js';

@Injectable()
export class SportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSportDto: CreateSportDto) {
    try {
      return await this.prisma.sport.create({
        data: {
          name: createSportDto.name,
          slug: createSportDto.slug,
          code: createSportDto.code,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A sport with the same name, slug, or code already exists.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.sport.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}