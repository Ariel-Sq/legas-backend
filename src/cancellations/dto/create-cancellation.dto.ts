import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCancellationDto {
  @ApiProperty({ example: 'Juana Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'juana@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+54 9 11 1234-5678' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Order id shown in "Mis pedidos" (optional)',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ example: 'Quiero cancelar mi compra.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
