import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { CancellationRequest } from './cancellation-request.entity';
import { CreateCancellationDto } from './dto/create-cancellation.dto';

@Injectable()
export class CancellationsService {
  private readonly logger = new Logger(CancellationsService.name);

  constructor(
    @InjectRepository(CancellationRequest)
    private readonly repository: Repository<CancellationRequest>,
  ) {}

  /**
   * Register a revocation request and return its trámite code. Resolución
   * 424/2020 requires handing the consumer an identification code within
   * 24 hours — we return it instantly in the response.
   */
  async create(dto: CreateCancellationDto): Promise<CancellationRequest> {
    const code = `ARR-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const request = this.repository.create({
      code,
      orderId: dto.orderId ?? null,
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      message: dto.message ?? null,
      status: 'pending',
    });
    const saved = await this.repository.save(request);
    this.logger.log(
      `Cancellation request ${saved.code} (order: ${saved.orderId ?? 'n/a'}, ${saved.email})`,
    );
    return saved;
  }
}
