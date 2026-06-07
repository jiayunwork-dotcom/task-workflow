import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskDefinitionsService } from './task-definitions.service';
import { TaskDefinitionsController } from './task-definitions.controller';
import { TaskDefinition } from './entities/task-definition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskDefinition])],
  controllers: [TaskDefinitionsController],
  providers: [TaskDefinitionsService],
  exports: [TaskDefinitionsService],
})
export class TaskDefinitionsModule {}
