import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { AlertsService } from './alerts.service';
import { MetricsController } from './metrics.controller';
import { AlertRule, Alert } from './entities/alert.entity';
import { TaskInstance } from '../task-instances/entities/task-instance.entity';
import { QueuesModule } from '../queues/queues.module';
import { WorkersModule } from '../workers/workers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertRule, Alert, TaskInstance]),
    QueuesModule,
    WorkersModule,
    AuthModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, AlertsService],
  exports: [MetricsService, AlertsService],
})
export class MetricsModule {}
