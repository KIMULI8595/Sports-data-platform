import { Body, Controller, Get, Param, ParseUUIDPipe, Post, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PrismaService } from '../database/prisma.service.js';
class LineupDto { @IsUUID() playerPublicId!: string; @IsUUID() teamPublicId!: string; @IsBoolean() starter!: boolean; @IsOptional() @IsBoolean() captain?: boolean; @IsOptional() @IsString() position?: string; }
class StatisticDto { @IsUUID() teamPublicId!: string; @IsString() @MaxLength(60) metric!: string; @IsNumber() value!: number; }
@Controller('matches') export class MatchDetailsController {
 constructor(private readonly prisma: PrismaService) {}
 @Get(':id/details') async details(@Param('id', ParseUUIDPipe) id: string) {
  const match = await this.prisma.match.findUnique({ where: { publicId: id }, include: { homeTeam: true, awayTeam: true, events: { include: { eventType: true, team: true }, orderBy: { sequenceNumber: 'asc' } }, lineups: { include: { player: true, team: true } }, teamStatistics: { include: { team: true } }, playerStatistics: { include: { player: true } } } });
  if (!match) throw new NotFoundException('Match not found'); return match;
 }
 @Post(':id/lineup') async lineup(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LineupDto) {
  const match = await this.prisma.match.findUnique({ where: { publicId: id } });
  const player = await this.prisma.player.findUnique({ where: { publicId: dto.playerPublicId } });
  const team = await this.prisma.team.findUnique({ where: { publicId: dto.teamPublicId } });
  if (!match || !player || !team) throw new NotFoundException('Match, player or team not found');
  if (team.id !== match.homeTeamId && team.id !== match.awayTeamId) throw new BadRequestException('Team is not in match');
  const member = await this.prisma.playerTeamMembership.findFirst({ where: { playerId: player.id, teamId: team.id, startDate: { lte: match.scheduledStart }, OR: [{ endDate: null }, { endDate: { gte: match.scheduledStart } }] } });
  if (!member) throw new BadRequestException('Player was not registered with this team at match date');
  return this.prisma.matchLineupPlayer.upsert({ where: { matchId_playerId: { matchId: match.id, playerId: player.id } }, create: { matchId: match.id, teamId: team.id, playerId: player.id, starter: dto.starter, captain: dto.captain ?? false, position: dto.position }, update: { teamId: team.id, starter: dto.starter, captain: dto.captain ?? false, position: dto.position } });
 }
 @Post(':id/team-statistics') async stat(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StatisticDto) {
  const match = await this.prisma.match.findUnique({ where: { publicId: id } });
  const team = await this.prisma.team.findUnique({ where: { publicId: dto.teamPublicId } });
  if (!match || !team) throw new NotFoundException('Match or team not found');
  if (team.id !== match.homeTeamId && team.id !== match.awayTeamId) throw new BadRequestException('Team is not in match');
  return this.prisma.teamMatchStatistic.upsert({ where: { matchId_teamId_metric: { matchId: match.id, teamId: team.id, metric: dto.metric } }, create: { matchId: match.id, teamId: team.id, metric: dto.metric, value: dto.value }, update: { value: dto.value } });
 }
}
