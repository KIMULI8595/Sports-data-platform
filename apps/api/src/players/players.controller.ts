import { Body, Controller, Get, Param, ParseUUIDPipe, Post, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength, validateOrReject } from 'class-validator';
import { PrismaService } from '../database/prisma.service.js';
class CreatePlayerDto { @IsString() @MaxLength(160) name!: string; @IsOptional() @IsString() nationality?: string; @IsOptional() @IsDateString() birthDate?: string; @IsOptional() @IsString() position?: string; }
class MembershipDto { @IsUUID() teamPublicId!: string; @IsDateString() startDate!: string; @IsOptional() @IsDateString() endDate?: string; @IsOptional() @IsInt() @Min(1) shirtNumber?: number; }
@Controller('players') export class PlayersController {
 constructor(private readonly prisma: PrismaService) {}
 @Get() list() { return this.prisma.player.findMany({ include: { memberships: { include: { team: true } } }, orderBy: { name: 'asc' } }); }
 @Post() create(@Body() body: CreatePlayerDto) { return this.prisma.player.create({ data: { name: body.name, nationality: body.nationality, position: body.position, birthDate: body.birthDate ? new Date(body.birthDate) : undefined } }); }
 @Post(':id/memberships') async membership(@Param('id', ParseUUIDPipe) id: string, @Body() body: MembershipDto) {
  const player = await this.prisma.player.findUnique({ where: { publicId: id } });
  const team = await this.prisma.team.findUnique({ where: { publicId: body.teamPublicId } });
  if (!player || !team) throw new NotFoundException('Player or team not found');
  if (body.endDate && body.endDate < body.startDate) throw new BadRequestException('End date must follow start date');
  return this.prisma.playerTeamMembership.create({ data: { playerId: player.id, teamId: team.id, startDate: new Date(body.startDate), endDate: body.endDate ? new Date(body.endDate) : undefined, shirtNumber: body.shirtNumber } });
 }
}
