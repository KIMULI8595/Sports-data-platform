import { Module } from '@nestjs/common';
import { SportsController } from './sports.controller.js';
import { SportsService } from './sports.service.js';

@Module({
  controllers: [SportsController],
  providers: [SportsService],
})
export class SportsModule {}