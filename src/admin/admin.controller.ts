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
  CreateCategoryDto,
  CreateProductDto,
  CreateVariationDto,
  InviteUserDto,
  UpdateImageDto,
  UpdateOrderStatusDto,
  UpdateHeroDto,
  PromotionBodyDto,
  SlideBodyDto,
  UpdateProductDto,
  UpdateReviewStatusDto,
  UpdateUserRoleDto,
  UpdateVariationDto,
  SendTestEmailDto,
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
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.SALES)
  @ApiOperation({ summary: 'Who am I inside the panel' })
  me(@Req() req: any) {
    return this.actor(req);
  }

  @Get('products')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
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
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  listCategories() {
    return this.adminService.listCategories();
  }

  /**
   * Mailer diagnostic: sends a real email so the operator can confirm the
   * credentials work without placing a test order.
   */
  @Post('emails/test')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Send a test email to check the mailer' })
  sendTestEmail(@Body() dto: SendTestEmailDto, @Req() req: any) {
    return this.adminService.sendTestEmail(dto.to, this.actor(req));
  }

  @Post('categories')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    return this.adminService.createCategory(dto.name, this.actor(req));
  }

  @Delete('categories/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteCategory(id, this.actor(req));
  }

  @Post('products')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
    return this.adminService.createProduct(dto, this.actor(req));
  }

  @Get('products/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
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

  @Post('products/:id/images')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  addProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.adminService.addProductImage(id, file, this.actor(req));
  }

  @Delete('variations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  deleteVariation(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteVariation(id, this.actor(req));
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
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.SALES)
  listOrders(@Query('status') status?: string) {
    return this.adminService.listOrders(status);
  }

  @Patch('orders/:id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.adminService.updateOrderStatus(id, dto, this.actor(req));
  }

  @Patch('orders/:id/deposit')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
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

  // ----- Promotions -----

  @Get('promotions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  listPromotions() {
    return this.adminService.listPromotions();
  }

  @Post('promotions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  createPromotion(@Body() dto: PromotionBodyDto, @Req() req: any) {
    return this.adminService.createPromotion(dto, this.actor(req));
  }

  @Patch('promotions/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updatePromotion(
    @Param('id') id: string,
    @Body() dto: PromotionBodyDto,
    @Req() req: any,
  ) {
    return this.adminService.updatePromotion(id, dto, this.actor(req));
  }

  @Delete('promotions/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  deletePromotion(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deletePromotion(id, this.actor(req));
  }

  // ----- Hero slides -----

  @Get('slides')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  listSlides() {
    return this.adminService.listSlides();
  }

  @Post('slides')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  createSlide(@Body() dto: SlideBodyDto, @Req() req: any) {
    return this.adminService.createSlide(dto, this.actor(req));
  }

  @Post('slides/:id/image')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  uploadSlideImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.adminService.uploadSlideImage(id, file, this.actor(req));
  }

  @Patch('slides/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updateSlide(
    @Param('id') id: string,
    @Body() dto: SlideBodyDto,
    @Req() req: any,
  ) {
    return this.adminService.updateSlide(id, dto, this.actor(req));
  }

  @Delete('slides/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  deleteSlide(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteSlide(id, this.actor(req));
  }

  // ----- Shop settings + stats -----

  @Get('settings')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  getSettings() {
    return this.adminService.getShopSettings();
  }

  @Patch('settings/:key')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  updateSettings(
    @Param('key') key: 'marquee' | 'payments' | 'shipping',
    @Body() value: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.adminService.updateShopSettings(key, value, this.actor(req));
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  stats(@Query('days') days?: string) {
    return this.adminService.getStats(Number(days) || 30);
  }

  @Get('reviews')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.SALES)
  listReviews(@Query('status') status?: string) {
    return this.adminService.listReviews(status);
  }

  @Patch('reviews/:id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.SALES)
  setReviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
    @Req() req: any,
  ) {
    return this.adminService.setReviewStatus(id, dto.status, this.actor(req));
  }

  @Delete('reviews/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  deleteReview(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteReview(id, this.actor(req));
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
