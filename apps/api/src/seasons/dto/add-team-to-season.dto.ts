import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddTeamToSeasonDto {
  @IsUUID()
  teamPublicId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  groupName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seed?: number;
}