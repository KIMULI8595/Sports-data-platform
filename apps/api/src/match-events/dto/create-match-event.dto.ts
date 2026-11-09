import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateMatchEventDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'eventTypeCode must contain uppercase letters, numbers or underscores only',
  })
  eventTypeCode!: string;

  @IsOptional()
  @IsUUID()
  teamPublicId?: string;

  @IsInt()
  @Min(1)
  sequenceNumber!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  second?: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsUUID()
  relatedEventPublicId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  providerCode?: string;

  @IsOptional()
  @IsString()
  providerEventId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}