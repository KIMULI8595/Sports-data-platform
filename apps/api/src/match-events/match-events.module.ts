import { Module } from '@nestjs/common';

import { MatchEventsController } from './match-events.controller.js';
import { MatchEventsService } from './match-events.service.js';

@Module({
  controllers: [MatchEventsController],
  providers: [MatchEventsService],
})
export class MatchEventsModule {}
