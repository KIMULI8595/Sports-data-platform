
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { DatabaseModule } from './database/database.module.js';
import { SportsModule } from './sports/sports.module.js';
import { CountriesModule } from './countries/countries.module.js';
import { CompetitionsModule } from './competitions/competitions.module.js';
import { SeasonsModule } from './seasons/seasons.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { MatchEventsModule } from './match-events/match-events.module.js';
import { PlayersModule } from './players/players.module.js';
import { StandingsModule } from './standings/standings.module.js';
import { MatchDetailsModule } from './match-details/match-details.module.js';

// Team performance analytics
import { AnalyticsModule } from './analytics/analytics.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,

    SportsModule,
    CountriesModule,
    CompetitionsModule,
    SeasonsModule,
    TeamsModule,
    MatchesModule,
    MatchEventsModule,
    PlayersModule,
    StandingsModule,
    MatchDetailsModule,

    AnalyticsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
