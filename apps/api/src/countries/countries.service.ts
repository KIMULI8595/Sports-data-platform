import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateCountryDto } from './dto/create-country.dto.js';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCountryDto: CreateCountryDto) {
    try {
      return await this.prisma.country.create({
        data: {
          name: createCountryDto.name,
          iso2Code: createCountryDto.iso2Code,
          iso3Code: createCountryDto.iso3Code,
          continentCode: createCountryDto.continentCode,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A country with the same name or ISO code already exists.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.country.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}