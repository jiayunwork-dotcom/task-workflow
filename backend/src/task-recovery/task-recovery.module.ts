import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskRecoveryService } from './task-recovery.service';
import { TaskInstance } from '../task-instances/entities/task-instance.entity';
import { Worker } from '../workers/entities/worker.entity';
import { TaskDefinitionsModule } from '../task-definitions/task-definitions.module';
import { QueuesModule } from '../queues/queues.module';
import { WorkersModule } from '../workers/workers.module';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskInstance, Worker]),
    TaskDefinitionsModule,
    QueuesModule,
    WorkersModule,
    WebsocketsModule,
  ],
  providers: [TaskRecoveryService],
  exports: [TaskRecoveryService],
})
export class TaskRecoveryModule {}
