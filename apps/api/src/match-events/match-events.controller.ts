import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { CreateMatchEventDto } from './dto/create-match-event.dto.js';
import { MatchEventsService } from './match-events.service.js';

@Controller('matches')
export class MatchEventsController {
  constructor(
    private readonly matchEventsService: MatchEventsService,
  ) {}

  @Post(':matchPublicId/events')
  create(
    @Param(
      'matchPublicId',
      new ParseUUIDPipe(),
    )
    matchPublicId: string,

    @Body()
    createMatchEventDto: CreateMatchEventDto,
  ) {
    return this.matchEventsService.create(
      matchPublicId,
      createMatchEventDto,
    );
  }

  @Get(':matchPublicId/events')
  findAll(
    @Param(
      'matchPublicId',
      new ParseUUIDPipe(),
    )
    matchPublicId: string,
  ) {
    return this.matchEventsService.findAll(
      matchPublicId,
    );
  }
}