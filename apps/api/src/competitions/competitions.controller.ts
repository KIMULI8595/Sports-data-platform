import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { CompetitionsService } from './competitions.service.js';
import { CreateCompetitionDto } from './dto/create-competition.dto.js';

@Controller('competitions')
export class CompetitionsController {
  constructor(
    private readonly competitionsService: CompetitionsService,
  ) {}

  @Post()
  create(
    @Body() createCompetitionDto: CreateCompetitionDto,
  ) {
    return this.competitionsService.create(
      createCompetitionDto,
    );
  }

  @Get()
  findAll() {
    return this.competitionsService.findAll();
  }
}