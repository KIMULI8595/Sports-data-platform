import { Module } from '@nestjs/common';
import { MatchDetailsController } from './match-details.controller.js';
@Module({ controllers: [MatchDetailsController] }) export class MatchDetailsModule {}
