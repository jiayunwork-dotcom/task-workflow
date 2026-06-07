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
import { TaskStatus, RetryStrategy, AuditLogType, AuditResourceType } from '../common/enums';
import { TaskDefinitionsService } from '../task-definitions/task-definitions.service';
import { QueuesService } from '../queues/queues.service';
import { WorkersService } from '../workers/workers.service';
import { EventsGateway } from '../websockets/events.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

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
    private eventsGateway: EventsGateway,
    private auditLogsService: AuditLogsService,
  ) {}

  private emitStatusChanged(
    taskId: string,
    oldStatus: TaskStatus | null,
    newStatus: TaskStatus,
  ): void {
    this.eventsGateway.emitTaskStatusChanged({
      taskId,
      oldStatus,
      newStatus,
      timestamp: Date.now(),
    });
  }

  private writeAuditLog(
    actionType: AuditLogType,
    resourceId: string,
    beforeSnapshot?: Record<string, any>,
    afterSnapshot?: Record<string, any>,
    durationMs?: number,
  ): void {
    try {
      this.auditLogsService.createAsync({
        actionType,
        operator: 'system',
        resourceId,
        resourceType: AuditResourceType.TASK,
        beforeSnapshot,
        afterSnapshot,
        durationMs,
      });
    } catch (e) {
      // Silently fail - audit log should not affect business logic
    }
  }

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

    this.emitStatusChanged(savedTask.id, null, TaskStatus.PENDING);
    this.writeAuditLog(
      AuditLogType.TASK_CREATED,
      savedTask.id,
      null,
      { ...savedTask },
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

        const oldStatus = task.status;
        const beforeSnapshot = { ...task };
        task.status = TaskStatus.CLAIMED;
        task.workerId = workerId;
        task.claimedAt = now;

        const savedTask = await this.taskInstanceRepository.save(task);
        this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.CLAIMED);
        this.writeAuditLog(
          AuditLogType.TASK_CLAIMED,
          savedTask.id,
          beforeSnapshot,
          { ...savedTask },
        );
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

    const oldStatus = task.status;
    const beforeSnapshot = { ...task };
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();

    const savedTask = await this.taskInstanceRepository.save(task);
    this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.RUNNING);
    this.writeAuditLog(
      AuditLogType.TASK_STARTED,
      savedTask.id,
      beforeSnapshot,
      { ...savedTask },
    );
    return savedTask;
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

    const oldStatus = task.status;
    const beforeSnapshot = { ...task };
    const startTime = Date.now();
    task.status = TaskStatus.SUCCESS;
    task.outputData = completeTaskDto.outputData;
    task.completedAt = new Date();
    task.progress = 100;

    await this.queuesService.completeTask(task.queueName, task.id);

    if (task.workerId) {
      await this.workersService.incrementProcessedTasks(task.workerId);
    }

    const savedTask = await this.taskInstanceRepository.save(task);
    this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.SUCCESS);
    this.writeAuditLog(
      AuditLogType.TASK_COMPLETED,
      savedTask.id,
      beforeSnapshot,
      { ...savedTask },
      Date.now() - startTime,
    );
    return savedTask;
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

    const oldStatus = task.status;
    const beforeSnapshot = { ...task };
    const startTime = Date.now();
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

      this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.PENDING);
      this.writeAuditLog(
        AuditLogType.TASK_REQUEUED,
        savedTask.id,
        beforeSnapshot,
        { ...savedTask },
        Date.now() - startTime,
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

      const savedTask = await this.taskInstanceRepository.save(task);
      this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.FAILED);
      this.writeAuditLog(
        AuditLogType.TASK_FAILED,
        savedTask.id,
        beforeSnapshot,
        { ...savedTask },
        Date.now() - startTime,
      );
      return savedTask;
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

    const oldStatus = task.status;
    task.status = TaskStatus.CANCELLED;
    task.completedAt = new Date();

    await this.queuesService.removeTask(task.queueName, task.id);

    const savedTask = await this.taskInstanceRepository.save(task);
    this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.CANCELLED);
    return savedTask;
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

    const oldStatus = task.status;
    const beforeSnapshot = { ...task };
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

    this.emitStatusChanged(savedTask.id, oldStatus, TaskStatus.PENDING);
    this.writeAuditLog(
      AuditLogType.TASK_REQUEUED,
      savedTask.id,
      beforeSnapshot,
      { ...savedTask },
    );
    return savedTask;
  }
}
