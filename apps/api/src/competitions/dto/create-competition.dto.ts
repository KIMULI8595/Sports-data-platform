import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCompetitionDto {
  @IsUUID()
  sportPublicId!: string;

  @IsOptional()
  @IsUUID()
  countryPublicId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  shortName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @IsString()
  @IsIn(['league', 'cup', 'tournament', 'friendly'])
  type!: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'mixed'])
  gender?: string;
}