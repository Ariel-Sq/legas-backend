import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveReviewDto {
  @ApiPropertyOptional({
    description: 'Razón opcional para la aprobación',
    example: 'Contenido apropiado y útil',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectReviewDto {
  @ApiProperty({
    description: 'Razón requerida para el rechazo',
    example: 'Contenido inapropiado o spam',
  })
  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  reason: string;
}

export class HideReviewDto {
  @ApiProperty({
    description: 'Razón requerida para ocultar el review',
    example: 'Violación de políticas de contenido',
  })
  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  reason: string;
}
