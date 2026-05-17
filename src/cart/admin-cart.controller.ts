import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@app/auth/guards/admin.guard';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';

@ApiTags('Admin / Cart')
@Controller('admin/cart')
@UseGuards(AdminGuard)
export class AdminCartController {
  constructor(private readonly cartService: CartService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all carts (admin only)' })
  @ApiResponse({ status: 200, description: 'All carts', type: [Cart] })
  async getAllCarts() {
    return this.cartService.findAll();
  }

  @Delete('clear-all')
  @ApiOperation({ summary: 'Delete all carts (admin only)' })
  @ApiResponse({ status: 200, description: 'All carts deleted' })
  async clearAllCarts() {
    await this.cartService.clearAll();
    return { message: 'All carts deleted' };
  }
}
