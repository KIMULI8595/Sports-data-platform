import { Module } from '@nestjs/common';
import { StandingsController } from './standings.controller.js';
@Module({ controllers: [StandingsController] }) export class StandingsModule {}
