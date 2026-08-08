import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IsIn, IsString, MaxLength } from 'class-validator';

// Keys must match the palette picker options in the frontend
// (components/palette-picker.tsx). Whitelisted so the table can't be
// polluted with arbitrary strings.
const BASES = ['calida', 'neutra', 'piedra', 'noche', 'bosque', 'arena'];
const ACCENTS = ['dorado', 'nogal', 'salvia', 'terracota', 'petroleo', 'tinta'];

class PaletteChoiceDto {
  @IsString()
  @MaxLength(30)
  @IsIn(BASES)
  base: string;

  @IsString()
  @MaxLength(30)
  @IsIn(ACCENTS)
  accent: string;
}

/**
 * Anonymous aggregate counters — answers "which palette do users pick
 * most?" (see frontend TODO) without tracking anyone.
 */
@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Post('palette')
  @HttpCode(204)
  @ApiOperation({ summary: 'Count a palette selection (anonymous)' })
  async paletteChoice(@Body() dto: PaletteChoiceDto): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO palette_choices ("base", "accent", "count", "updatedAt")
       VALUES ($1, $2, 1, now())
       ON CONFLICT ("base", "accent")
       DO UPDATE SET "count" = palette_choices."count" + 1, "updatedAt" = now()`,
      [dto.base, dto.accent],
    );
  }
}
