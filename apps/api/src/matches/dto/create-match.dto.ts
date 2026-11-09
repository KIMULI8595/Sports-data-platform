import {
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateMatchDto {
  @IsUUID()
  seasonPublicId!: string;

  @IsUUID()
  homeTeamPublicId!: string;

  @IsUUID()
  awayTeamPublicId!: string;

  @IsDateString()
  scheduledStart!: string;
}