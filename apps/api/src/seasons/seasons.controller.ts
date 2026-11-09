import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { CreateSeasonDto } from './dto/create-season.dto.js';
import { SeasonsService } from './seasons.service.js';

import { AddTeamToSeasonDto } from './dto/add-team-to-season.dto.js';

@Controller('seasons')
export class SeasonsController {
  constructor(
    private readonly seasonsService: SeasonsService,
  ) {}

  @Post()
  create(
    @Body() createSeasonDto: CreateSeasonDto,
  ) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  findAll() {
    return this.seasonsService.findAll();
  }

    @Post(':seasonPublicId/teams')
  addTeam(
    @Param('seasonPublicId', new ParseUUIDPipe())
    seasonPublicId: string,

    @Body()
    addTeamToSeasonDto: AddTeamToSeasonDto,
  ) {
    return this.seasonsService.addTeam(
      seasonPublicId,
      addTeamToSeasonDto,
    );
  }

  @Get(':seasonPublicId/teams')
  findTeams(
    @Param('seasonPublicId', new ParseUUIDPipe())
    seasonPublicId: string,) {
    return this.seasonsService.findTeams(seasonPublicId);
  }
}