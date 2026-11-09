import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller.js';
@Module({ controllers: [PlayersController] }) export class PlayersModule {}
