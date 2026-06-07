import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskInstance } from './entities/task-instance.entity';
import {
  CreateTaskInstanceDto,
  ClaimTaskDto,
  UpdateTaskProgressDto,
  CompleteTaskDto,
  FailTaskDto,
} from './dto/task-instance.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { TaskStatus, RetryStrategy } from '../common/enums';
import { TaskDefinitionsService } from '../task-definitions/task-definitions.service';
import { QueuesService } from '../queues/queues.service';
import { WorkersService } from '../workers/workers.service';

@Injectable()
export class TaskInstancesService {
  constructor(
    @InjectRepository(TaskInstance)
    private taskInstanceRepository: Repository<TaskInstance>,
    private taskDefinitionsService: TaskDefinitionsService,
    private queuesService: QueuesService,
    private workersService: WorkersService,
    @Inject('REDIS_CLIENT')
    private redis: any,
  ) {}

  private calculateRetryDelay(
    retryStrategy: RetryStrategy,
    retryCount: number,
    baseDelay: number = 1000,
  ): number {
    switch (retryStrategy) {
      case RetryStrategy.FIXED:
        return baseDelay;

      case RetryStrategy.EXPONENTIAL:
        return baseDelay * Math.pow(2, retryCount);

      case RetryStrategy.EXPONENTIAL_WITH_JITTER:
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = exponentialDelay * 0.5 * Math.random();
        return exponentialDelay + jitter;

      default:
        return baseDelay;
    }
  }

  async create(
    createTaskInstanceDto: CreateTaskInstanceDto,
  ): Promise<TaskInstance> {
    const {
      taskDefinitionName,
      taskVersion,
      queueName,
      inputData,
      delayedUntil,
      priority,
    } = createTaskInstanceDto;

    let taskDefinition;
    if (taskVersion) {
      const definitions = await this.taskDefinitionsService.findByName(
        taskDefinitionName,
      );
      taskDefinition = definitions.find((d) => d.version === taskVersion);
      if (!taskDefinition) {
        throw new NotFoundException(
          `TaskDefinition "${taskDefinitionName}" version ${taskVersion} not found`,
        );
      }
    } else {
      taskDefinition = await this.taskDefinitionsService.findLatestByName(
        taskDefinitionName,
      );
    }

    const finalQueueName = queueName || taskDefinition.queueName;

    const taskInstance = this.taskInstanceRepository.create({
      taskDefinitionName,
      taskVersion: taskDefinition.version,
      queueName: finalQueueName,
      inputData,
      delayedUntil: delayedUntil ? new Date(delayedUntil) : undefined,
      workflowInstanceId: createTaskInstanceDto.workflowInstanceId,
      stepId: createTaskInstanceDto.stepId,
    });

    const savedTask = await this.taskInstanceRepository.save(taskInstance);

    await this.queuesService.enqueue(
      finalQueueName,
      savedTask.id,
      priority ?? taskDefinition.priority,
      savedTask.delayedUntil,
    );

    return savedTask;
  }

  async findAll(
    paginationDto: PaginationDto,
    status?: TaskStatus,
    queueName?: string,
    workerId?: string,
  ): Promise<PaginatedResponseDto<TaskInstance>> {
    const { page, limit } = paginationDto;
    const where: any = {};
    if (status) where.status = status;
    if (queueName) where.queueName = queueName;
    if (workerId) where.workerId = workerId;

    const [data, total] = await this.taskInstanceRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TaskInstance> {
    const taskInstance = await this.taskInstanceRepository.findOne({
      where: { id },
    });
    if (!taskInstance) {
      throw new NotFoundException(`TaskInstance with ID "${id}" not found`);
    }
    return taskInstance;
  }

  async claimTasks(claimTaskDto: ClaimTaskDto): Promise<TaskInstance[]> {
    const { workerId, queueName, count = 1 } = claimTaskDto;

    await this.workersService.findOne(workerId);

    const taskIds = await this.queuesService.dequeue(queueName, count);
    if (taskIds.length === 0) {
      return [];
    }

    const claimedTasks: TaskInstance[] = [];
    const now = new Date();

    for (const taskId of taskIds) {
      try {
        const task = await this.findOne(taskId);

        if (task.status !== TaskStatus.PENDING) {
          await this.queuesService.removeTask(queueName, taskId);
          continue;
        }

        task.status = TaskStatus.CLAIMED;
        task.workerId = workerId;
        task.claimedAt = now;

        const savedTask = await this.taskInstanceRepository.save(task);
        claimedTasks.push(savedTask);
      } catch (e) {
        await this.queuesService.removeTask(queueName, taskId);
      }
    }

    return claimedTasks;
  }

  async startTask(id: string, workerId: string): Promise<TaskInstance> {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.CLAIMED) {
      throw new BadRequestException(
        `Cannot start task with status "${task.status}". Task must be claimed first.`,
      );
    }

    if (task.workerId !== workerId) {
      throw new ConflictException(
        `Task is claimed by a different worker: ${task.workerId}`,
      );
    }

    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();

    return this.taskInstanceRepository.save(task);
  }

  async updateProgress(
    id: string,
    updateTaskProgressDto: UpdateTaskProgressDto,
  ): Promise<TaskInstance> {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.RUNNING) {
      throw new BadRequestException(
        `Cannot update progress for task with status "${task.status}"`,
      );
    }

    task.progress = updateTaskProgressDto.progress;
    return this.taskInstanceRepository.save(task);
  }

  async completeTask(
    id: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<TaskInstance> {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.RUNNING) {
      throw new BadRequestException(
        `Cannot complete task with status "${task.status}"`,
      );
    }

    task.status = TaskStatus.SUCCESS;
    task.outputData = completeTaskDto.outputData;
    task.completedAt = new Date();
    task.progress = 100;

    await this.queuesService.completeTask(task.queueName, task.id);

    if (task.workerId) {
      await this.workersService.incrementProcessedTasks(task.workerId);
    }

    return this.taskInstanceRepository.save(task);
  }

  async failTask(
    id: string,
    failTaskDto: FailTaskDto,
  ): Promise<TaskInstance> {
    const task = await this.findOne(id);

    if (
      task.status !== TaskStatus.RUNNING &&
      task.status !== TaskStatus.CLAIMED
    ) {
      throw new BadRequestException(
        `Cannot fail task with status "${task.status}"`,
      );
    }

    const taskDefinitions = await this.taskDefinitionsService.findByName(
      task.taskDefinitionName,
    );
    const taskDef = taskDefinitions.find(
      (d) => d.version === task.taskVersion,
    );

    await this.queuesService.completeTask(task.queueName, task.id);

    if (taskDef && task.retries < taskDef.maxRetries) {
      const retryDelay = this.calculateRetryDelay(
        taskDef.retryStrategy,
        task.retries,
      );
      const delayedUntil = new Date(Date.now() + retryDelay);

      task.retries += 1;
      task.status = TaskStatus.PENDING;
      task.workerId = null;
      task.claimedAt = null;
      task.startedAt = null;
      task.delayedUntil = delayedUntil;
      task.error = failTaskDto.error;

      const savedTask = await this.taskInstanceRepository.save(task);

      await this.queuesService.enqueue(
        task.queueName,
        savedTask.id,
        taskDef.priority,
        delayedUntil,
      );

      return savedTask;
    } else {
      task.status = TaskStatus.FAILED;
      task.error = failTaskDto.error;
      task.outputData = failTaskDto.outputData;
      task.completedAt = new Date();

      await this.queuesService.moveToDeadLetter(
        task.queueName,
        task.id,
        failTaskDto.error,
      );

      if (task.workerId) {
        await this.workersService.incrementProcessedTasks(task.workerId);
      }

      return this.taskInstanceRepository.save(task);
    }
  }

  async cancelTask(id: string): Promise<TaskInstance> {
    const task = await this.findOne(id);

    if (
      task.status === TaskStatus.SUCCESS ||
      task.status === TaskStatus.FAILED ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel task with status "${task.status}"`,
      );
    }

    task.status = TaskStatus.CANCELLED;
    task.completedAt = new Date();

    await this.queuesService.removeTask(task.queueName, task.id);

    return this.taskInstanceRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);

    if (
      task.status === TaskStatus.RUNNING ||
      task.status === TaskStatus.CLAIMED
    ) {
      throw new BadRequestException(
        `Cannot delete task with status "${task.status}". Cancel it first.`,
      );
    }

    await this.queuesService.removeTask(task.queueName, task.id);
    await this.taskInstanceRepository.delete(id);
  }

  async requeueTask(id: string): Promise<TaskInstance> {
    const task = await this.findOne(id);

    if (
      task.status !== TaskStatus.FAILED &&
      task.status !== TaskStatus.CANCELLED &&
      task.status !== TaskStatus.TIMEOUT
    ) {
      throw new BadRequestException(
        `Cannot requeue task with status "${task.status}"`,
      );
    }

    const taskDefinitions = await this.taskDefinitionsService.findByName(
      task.taskDefinitionName,
    );
    const taskDef = taskDefinitions.find(
      (d) => d.version === task.taskVersion,
    );

    task.status = TaskStatus.PENDING;
    task.workerId = null;
    task.claimedAt = null;
    task.startedAt = null;
    task.completedAt = null;
    task.error = null;
    task.progress = 0;
    task.retries = 0;

    const savedTask = await this.taskInstanceRepository.save(task);

    await this.queuesService.enqueue(
      task.queueName,
      savedTask.id,
      taskDef?.priority || 0,
    );

    return savedTask;
  }
}
