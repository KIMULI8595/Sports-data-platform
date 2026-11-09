import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { CreateSportDto } from './dto/create-sport.dto.js';
import { SportsService } from './sports.service.js';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Post()
  create(@Body() createSportDto: CreateSportDto) {
    return this.sportsService.create(createSportDto);
  }

  @Get()
  findAll() {
    return this.sportsService.findAll();
  }
}