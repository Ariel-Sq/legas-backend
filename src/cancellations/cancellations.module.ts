import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancellationRequest } from './cancellation-request.entity';
import { CancellationsController } from './cancellations.controller';
import { CancellationsService } from './cancellations.service';

@Module({
  imports: [TypeOrmModule.forFeature([CancellationRequest])],
  controllers: [CancellationsController],
  providers: [CancellationsService],
})
export class CancellationsModule {}
