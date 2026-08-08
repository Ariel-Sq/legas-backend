import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [TypeOrmModule],
  controllers: [MetricsController],
})
export class MetricsModule {}
