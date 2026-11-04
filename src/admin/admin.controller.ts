import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard, Roles, type AdminActor } from './admin.guard';
import { AdminService } from './admin.service';
import {
  CreateProductDto,
  CreateVariationDto,
  InviteUserDto,
  UpdateImageDto,
  UpdateOrderStatusDto,
  UpdateHeroDto,
  UpdateProductDto,
  UpdateUserRoleDto,
  UpdateVariationDto,
} from './dto/admin.dto';
import { UserRole } from '@app/users/entities/user.entity';

/**
 * Admin panel API. Every route requires a signed-in user whose *database* role
 * is owner or admin (editor only for catalogue writes); the owner is resolved
 * from OWNER_EMAIL.
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private actor(req: any): AdminActor {
    return req.adminUser as AdminActor;
  }

  @Get('me')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Who am I inside the panel' })
  me(@Req() req: any) {
    return this.actor(req);
  }

  @Get('products')
  @ApiOperation({ summary: 'List products with a summary row per template' })
  listProducts(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listProducts(
      q,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('products')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
    return this.adminService.createProduct(dto, this.actor(req));
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(id);
  }

  @Patch('products/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.adminService.updateProduct(id, dto, this.actor(req));
  }

  @Post('products/:id/variations')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  createVariation(
    @Param('id') id: string,
    @Body() dto: CreateVariationDto,
    @Req() req: any,
  ) {
    return this.adminService.createVariation(id, dto, this.actor(req));
  }

  @Patch('variations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updateVariation(
    @Param('id') id: string,
    @Body() dto: UpdateVariationDto,
    @Req() req: any,
  ) {
    return this.adminService.updateVariation(id, dto, this.actor(req));
  }

  @Post('variations/:id/images')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  addImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.adminService.addImage(id, file, this.actor(req));
  }

  @Patch('images/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updateImage(
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
    @Req() req: any,
  ) {
    return this.adminService.updateImage(id, dto, this.actor(req));
  }

  @Delete('images/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  deleteImage(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteImage(id, this.actor(req));
  }

  @Delete('products/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  deleteProduct(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteProduct(id, this.actor(req));
  }

  @Get('orders')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  listOrders(@Query('status') status?: string) {
    return this.adminService.listOrders(status);
  }

  @Patch('orders/:id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.adminService.updateOrderStatus(id, dto, this.actor(req));
  }

  @Patch('orders/:id/deposit')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  markDepositPaid(@Param('id') id: string, @Req() req: any) {
    return this.adminService.markDepositPaid(id, this.actor(req));
  }

  @Post('users/invite')
  @Roles(UserRole.OWNER)
  inviteUser(@Body() dto: InviteUserDto, @Req() req: any) {
    return this.adminService.inviteUser(dto, this.actor(req));
  }

  @Get('hero')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  getHero() {
    return this.adminService.getHero();
  }

  @Patch('hero')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updateHero(@Body() dto: UpdateHeroDto, @Req() req: any) {
    return this.adminService.updateHero(dto, this.actor(req));
  }

  @Post('hero/image')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  uploadHeroImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.adminService.uploadHeroImage(file, this.actor(req));
  }

  @Delete('hero/image')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  deleteHeroImage(@Req() req: any) {
    return this.adminService.deleteHeroImage(this.actor(req));
  }

  @Get('users')
  @Roles(UserRole.OWNER)
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/role')
  @Roles(UserRole.OWNER)
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserRole(id, dto, this.actor(req));
  }

  @Get('audit')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  listAudit(@Query('limit') limit?: string) {
    return this.adminService.listAudit(limit ? Number(limit) : undefined);
  }
}
