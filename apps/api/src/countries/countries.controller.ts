import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { CountriesService } from './countries.service.js';
import { CreateCountryDto } from './dto/create-country.dto.js';

@Controller('countries')
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
  ) {}

  @Post()
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countriesService.create(createCountryDto);
  }

  @Get()
  findAll() {
    return this.countriesService.findAll();
  }
}