import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for adding a product variation to the authenticated user's wishlist.
 */
export class AddWishlistItemDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: 'Product variation ID to add to the wishlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productVariationId: string;
}
