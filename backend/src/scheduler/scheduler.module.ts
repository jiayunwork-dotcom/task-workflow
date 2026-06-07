import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SchedulerTasksService } from './scheduler-tasks.service';
import { SchedulerController } from './scheduler.controller';
import { CronJob } from './entities/cron-job.entity';
import { WorkflowsModule } from '../workflows/workflows.module';
import { WorkersModule } from '../workers/workers.module';
import { TaskRecoveryModule } from '../task-recovery/task-recovery.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CronJob]),
    ScheduleModule.forRoot(),
    WorkflowsModule,
    WorkersModule,
    TaskRecoveryModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerTasksService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
