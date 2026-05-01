import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ModerationService } from '../services/moderation.service';
import { Review } from '../entities/review.entity';
import { AdminGuard } from '../../auth/guards/admin.guard';
import {
  ApproveReviewDto,
  HideReviewDto,
  RejectReviewDto,
} from '../dto/moderation.dto';

@ApiTags('Moderation')
@Controller('admin/reviews')
@UseGuards(AdminGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de moderación',
    description:
      'Obtiene estadísticas generales sobre el estado de los reviews.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        pending: { type: 'number' },
        approved: { type: 'number' },
        rejected: { type: 'number' },
        hidden: { type: 'number' },
        flagged: { type: 'number' },
      },
    },
  })
  async getModerationStats() {
    return this.moderationService.getModerationStats();
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprobar un review',
    description:
      'Aprueba un review pendiente, haciendo que sea visible públicamente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del review a aprobar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Review aprobado exitosamente',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review no encontrado',
  })
  async approveReview(
    @Param('id') id: string,
    @Body() body: ApproveReviewDto = {},
    @Request() req: any,
  ): Promise<Review> {
    return this.moderationService.approveReview(id, req.user.id, body?.reason);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rechazar un review',
    description: 'Rechaza un review, evitando que sea visible públicamente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del review a rechazar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Review rechazado exitosamente',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review no encontrado',
  })
  async rejectReview(
    @Param('id') id: string,
    @Body() body: RejectReviewDto,
    @Request() req: any,
  ): Promise<Review> {
    return this.moderationService.rejectReview(id, req.user.id, body.reason);
  }

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ocultar un review',
    description:
      'Oculta un review aprobado, removiendo su visibilidad pública.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del review a ocultar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Review ocultado exitosamente',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review no encontrado',
  })
  async hideReview(
    @Param('id') id: string,
    @Body() body: HideReviewDto,
    @Request() req: any,
  ): Promise<Review> {
    return this.moderationService.hideReview(id, req.user.id, body.reason);
  }
}
