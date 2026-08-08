import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CancellationsService } from './cancellations.service';
import { CreateCancellationDto } from './dto/create-cancellation.dto';

/**
 * Public endpoint behind the "botón de arrepentimiento" (Resolución
 * 424/2020). Deliberately requires NO registration or authentication —
 * the resolution forbids demanding either. Global throttling applies.
 */
@ApiTags('Cancellations')
@Controller('cancellations')
export class CancellationsController {
  constructor(private readonly cancellationsService: CancellationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Request purchase revocation (botón de arrepentimiento)',
    description:
      'Registers the request and returns the trámite code the consumer keeps.',
  })
  @ApiResponse({
    status: 201,
    description: 'Request registered; code returned.',
  })
  async create(@Body() dto: CreateCancellationDto) {
    const request = await this.cancellationsService.create(dto);
    return { code: request.code, createdAt: request.createdAt };
  }
}
