import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateMatchDto } from './dto/create-match.dto.js';
import { MatchesService } from './matches.service.js';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
  ) {}

  @Post()
  create(
    @Body() createMatchDto: CreateMatchDto,
  ) {
    return this.matchesService.create(createMatchDto);
  }

  @Get()
  findAll() {
    return this.matchesService.findAll();
  }

  @Patch(':matchPublicId/start')
  start(
    @Param(
      'matchPublicId',
      new ParseUUIDPipe(),
    )
    matchPublicId: string,
  ) {
    return this.matchesService.start(matchPublicId);
  }

  @Patch(':matchPublicId/half-time')
  halfTime(
    @Param(
      'matchPublicId',
      new ParseUUIDPipe(),
    )
    matchPublicId: string,
  ) {
    return this.matchesService.halfTime(
      matchPublicId,
    );
  }

  @Patch(':matchPublicId/second-half')
  startSecondHalf(
    @Param(
      'matchPublicId',
      new ParseUUIDPipe(),
    )
    matchPublicId: string,
  ) {
    return this.matchesService.startSecondHalf(
      matchPublicId,
    );
  }

  @Patch(':matchPublicId/finish')
  finish(
    @Param(
      'matchPublicId',
      new ParseUUIDPipe(),
    )
    matchPublicId: string,
  ) {
    return this.matchesService.finish(
      matchPublicId,
    );
  }
}