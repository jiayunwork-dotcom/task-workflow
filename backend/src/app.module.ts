import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { TaskDefinitionsModule } from './task-definitions/task-definitions.module';
import { QueuesModule } from './queues/queues.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { WorkersModule } from './workers/workers.module';
import { TaskInstancesModule } from './task-instances/task-instances.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuthModule } from './auth/auth.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RedisModule,
    TaskDefinitionsModule,
    QueuesModule,
    WorkflowsModule,
    WorkersModule,
    TaskInstancesModule,
    SchedulerModule,
    AuthModule,
    MetricsModule,
  ],
})
export class AppModule {}
