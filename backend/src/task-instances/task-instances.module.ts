import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskInstancesService } from './task-instances.service';
import { TaskInstancesController } from './task-instances.controller';
import { TaskInstance } from './entities/task-instance.entity';
import { TaskDefinitionsModule } from '../task-definitions/task-definitions.module';
import { QueuesModule } from '../queues/queues.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskInstance]),
    TaskDefinitionsModule,
    QueuesModule,
    WorkersModule,
  ],
  controllers: [TaskInstancesController],
  providers: [TaskInstancesService],
  exports: [TaskInstancesService],
})
export class TaskInstancesModule {}
