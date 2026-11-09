import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, {
    message: 'iso2Code must contain exactly 2 uppercase letters',
  })
  iso2Code!: string;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'iso3Code must contain exactly 3 uppercase letters',
  })
  iso3Code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  continentCode?: string;
}