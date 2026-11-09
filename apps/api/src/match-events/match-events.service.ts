import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateMatchEventDto } from './dto/create-match-event.dto.js';

@Injectable()
export class MatchEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    matchPublicId: string,
    createMatchEventDto: CreateMatchEventDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const match = await tx.match.findUnique({
          where: {
            publicId: matchPublicId,
          },
        });

        if (!match) {
          throw new NotFoundException('Match not found.');
        }

        const providerCode = createMatchEventDto.providerCode;
        const providerEventId = createMatchEventDto.providerEventId;
        if (Boolean(providerCode) !== Boolean(providerEventId)) {
          throw new BadRequestException('providerCode and providerEventId must be supplied together.');
        }
        const provider = providerCode ? await tx.dataProvider.findUnique({ where: { code: providerCode } }) : null;
        if (providerCode && (!provider || provider.status !== 'active')) {
          throw new NotFoundException('Active data provider not found.');
        }
        if (provider && providerEventId) {
          const existing = await tx.matchEvent.findUnique({
            where: { providerId_providerEventId: { providerId: provider.id, providerEventId } },
          });
          if (existing) {
            if (existing.matchId !== match.id) throw new ConflictException('Provider event belongs to another match.');
            return tx.matchEvent.findUnique({ where: { id: existing.id }, include: { eventType: true, team: true, relatedEvent: { include: { eventType: true, team: true } } } });
          }
        }

        if (match.status !== 'live' || !match.period) {
          throw new BadRequestException(
            'Match events can only be added while the match is live.',
          );
        }

        const eventType = await tx.eventType.findUnique({
          where: {
            code: createMatchEventDto.eventTypeCode,
          },
        });

        if (!eventType) {
          throw new NotFoundException(
            `Event type ${createMatchEventDto.eventTypeCode} was not found.`,
          );
        }

        let team:
          | {
              id: number;
              publicId: string;
              name: string;
            }
          | null = null;

        if (createMatchEventDto.teamPublicId) {
          team = await tx.team.findUnique({
            where: {
              publicId: createMatchEventDto.teamPublicId,
            },
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          });

          if (!team) {
            throw new NotFoundException('Team not found.');
          }

          if (
            team.id !== match.homeTeamId &&
            team.id !== match.awayTeamId
          ) {
            throw new BadRequestException(
              'The selected team is not participating in this match.',
            );
          }
        }

        let relatedEvent:
          | {
              id: number;
              publicId: string;
              matchId: number;
              teamId: number | null;
              status: string;
              eventType: {
                code: string;
              };
            }
          | null = null;

        if (createMatchEventDto.relatedEventPublicId) {
          relatedEvent = await tx.matchEvent.findUnique({
            where: {
              publicId:
                createMatchEventDto.relatedEventPublicId,
            },
            select: {
              id: true,
              publicId: true,
              matchId: true,
              teamId: true,
              status: true,
              eventType: {
                select: {
                  code: true,
                },
              },
            },
          });

          if (!relatedEvent) {
            throw new NotFoundException(
              'Related match event not found.',
            );
          }

          if (relatedEvent.matchId !== match.id) {
            throw new BadRequestException(
              'Related event must belong to the same match.',
            );
          }
        }

        const scoringEventCodes = new Set([
          'GOAL',
          'PENALTY_GOAL',
          'OWN_GOAL',
        ]);

        const isScoringEvent =
          scoringEventCodes.has(eventType.code);

        if (isScoringEvent && !team) {
          throw new BadRequestException(
            'A scoring event must identify the team receiving the goal.',
          );
        }

        /*
         * VAR GOAL REVERSAL
         */
        if (eventType.code === 'VAR_DECISION') {
          const decision =
            typeof createMatchEventDto.metadata?.decision ===
            'string'
              ? createMatchEventDto.metadata.decision
              : null;

          if (!relatedEvent) {
            throw new BadRequestException(
              'A VAR decision must reference the event being reviewed.',
            );
          }

          if (decision !== 'goal_disallowed') {
            throw new BadRequestException(
              'The current VAR implementation only supports the goal_disallowed decision.',
            );
          }

          if (
            !scoringEventCodes.has(
              relatedEvent.eventType.code,
            )
          ) {
            throw new BadRequestException(
              'The referenced event is not a scoring event.',
            );
          }

          if (relatedEvent.status !== 'confirmed') {
            throw new BadRequestException(
              'Only a confirmed scoring event can be reversed.',
            );
          }

          if (!relatedEvent.teamId) {
            throw new BadRequestException(
              'The referenced scoring event has no team.',
            );
          }

          const reversedEvent =
            await tx.matchEvent.updateMany({
              where: {
                id: relatedEvent.id,
                status: 'confirmed',
              },
              data: {
                status: 'reversed',
              },
            });

          if (reversedEvent.count === 0) {
            throw new ConflictException(
              'The scoring event was already changed by another request.',
            );
          }

          const isHomeTeam =
            relatedEvent.teamId === match.homeTeamId;

          const scoreUpdate =
            await tx.match.updateMany({
              where: {
                id: match.id,
                status: 'live',

                ...(isHomeTeam
                  ? {
                      homeScore: {
                        gt: 0,
                      },
                    }
                  : {
                      awayScore: {
                        gt: 0,
                      },
                    }),
              },

              data: isHomeTeam
                ? {
                    homeScore: {
                      decrement: 1,
                    },
                  }
                : {
                    awayScore: {
                      decrement: 1,
                    },
                  },
            });

          if (scoreUpdate.count === 0) {
            throw new BadRequestException(
              'The score could not be reversed safely.',
            );
          }
        }

        /*
         * CREATE THE CANONICAL EVENT
         */
        const event = await tx.matchEvent.create({
          data: {
            matchId: match.id,
            providerId: provider?.id ?? null,
            providerEventId: providerEventId ?? null,
            eventTypeId: eventType.id,
            teamId: team?.id ?? null,

            relatedEventId:
              relatedEvent?.id ?? null,

            sequenceNumber:
              createMatchEventDto.sequenceNumber,

            period: match.period,

            minute: createMatchEventDto.minute,
            second: createMatchEventDto.second,

            occurredAt: createMatchEventDto.occurredAt
              ? new Date(
                  createMatchEventDto.occurredAt,
                )
              : new Date(),

            processedAt: new Date(),

            metadata: createMatchEventDto.metadata
              ? (createMatchEventDto.metadata as Prisma.InputJsonValue)
              : undefined,
          },
        });

        /*
         * NORMAL SCORING EVENT
         */
        if (isScoringEvent && team) {
          const isHomeTeam =
            team.id === match.homeTeamId;

          const scoreUpdate =
            await tx.match.updateMany({
              where: {
                id: match.id,
                status: 'live',
                period: match.period,
              },

              data: isHomeTeam
                ? {
                    homeScore: {
                      increment: 1,
                    },
                  }
                : {
                    awayScore: {
                      increment: 1,
                    },
                  },
            });

          if (scoreUpdate.count === 0) {
            throw new BadRequestException(
              'The match state changed before the scoring event could be processed.',
            );
          }
        }

        return tx.matchEvent.findUnique({
          where: {
            id: event.id,
          },

          include: {
            eventType: true,
            team: true,

            relatedEvent: {
              include: {
                eventType: true,
                team: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (createMatchEventDto.providerCode && createMatchEventDto.providerEventId) {
          const provider = await this.prisma.dataProvider.findUnique({ where: { code: createMatchEventDto.providerCode } });
          if (provider) {
            const existing = await this.prisma.matchEvent.findUnique({ where: { providerId_providerEventId: { providerId: provider.id, providerEventId: createMatchEventDto.providerEventId } }, include: { eventType: true, team: true } });
            if (existing) {
              const match = await this.prisma.match.findUnique({ where: { publicId: matchPublicId } });
              if (match && existing.matchId === match.id) return existing;
              throw new ConflictException('Provider event belongs to another match.');
            }
          }
        }
        throw new ConflictException('Event sequence or provider event already exists.');
      }

      throw error;
    }
  }

  async findAll(matchPublicId: string) {
    const match = await this.prisma.match.findUnique({
      where: {
        publicId: matchPublicId,
      },

      select: {
        id: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    return this.prisma.matchEvent.findMany({
      where: {
        matchId: match.id,
      },

      include: {
        eventType: true,
        team: true,

        relatedEvent: {
          include: {
            eventType: true,
            team: true,
          },
        },
      },

      orderBy: {
        sequenceNumber: 'asc',
      },
    });
  }
}