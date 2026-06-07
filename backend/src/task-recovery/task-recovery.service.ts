import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TaskInstance } from '../task-instances/entities/task-instance.entity';
import { Worker } from '../workers/entities/worker.entity';
import { TaskStatus, WorkerStatus } from '../common/enums';
import { TaskDefinitionsService } from '../task-definitions/task-definitions.service';
import { QueuesService } from '../queues/queues.service';
import { WorkersService } from '../workers/workers.service';
import { EventsGateway } from '../websockets/events.gateway';

const WORKER_HEARTBEAT_TIMEOUT = 60;

@Injectable()
export class TaskRecoveryService {
  private readonly logger = new Logger(TaskRecoveryService.name);

  constructor(
    @InjectRepository(TaskInstance)
    private taskInstanceRepository: Repository<TaskInstance>,
    @InjectRepository(Worker)
    private workerRepository: Repository<Worker>,
    private taskDefinitionsService: TaskDefinitionsService,
    private queuesService: QueuesService,
    private workersService: WorkersService,
    private eventsGateway: EventsGateway,
  ) {}

  async recoverTimedOutTasks(): Promise<void> {
    this.logger.log('Scanning for timed out tasks...');

    const runningTasks = await this.taskInstanceRepository.find({
      where: { status: TaskStatus.RUNNING },
      relations: [],
    });

    const now = new Date();
    const timedOutTasks: TaskInstance[] = [];

    for (const task of runningTasks) {
      if (!task.startedAt) continue;

      const taskDefinitions = await this.taskDefinitionsService.findByName(
        task.taskDefinitionName,
      );
      const taskDef = taskDefinitions.find(
        (d) => d.version === task.taskVersion,
      );

      if (!taskDef) continue;

      const timeoutMs = taskDef.timeout * 1000;
      const elapsedMs = now.getTime() - task.startedAt.getTime();

      if (elapsedMs > timeoutMs) {
        timedOutTasks.push(task);
      }
    }

    this.logger.log(`Found ${timedOutTasks.length} timed out tasks`);

    for (const task of timedOutTasks) {
      await this.handleTimedOutTask(task);
    }
  }

  private async handleTimedOutTask(task: TaskInstance): Promise<void> {
    this.logger.warn(`Task ${task.id} timed out`);

    const oldStatus = task.status;
    const taskDefinitions = await this.taskDefinitionsService.findByName(
      task.taskDefinitionName,
    );
    const taskDef = taskDefinitions.find(
      (d) => d.version === task.taskVersion,
    );

    if (task.workerId) {
      await this.queuesService.completeTask(task.queueName, task.id);
    }

    if (taskDef && task.retries < taskDef.maxRetries) {
      task.retries += 1;
      task.status = TaskStatus.TIMEOUT;
      task.workerId = null;
      task.claimedAt = null;
      task.startedAt = null;
      task.error = `Task timed out after ${taskDef.timeout} seconds`;

      await this.taskInstanceRepository.save(task);
      this.eventsGateway.emitTaskStatusChanged({
        taskId: task.id,
        oldStatus,
        newStatus: TaskStatus.TIMEOUT,
        timestamp: Date.now(),
      });

      task.status = TaskStatus.PENDING;
      const savedTask = await this.taskInstanceRepository.save(task);
      this.eventsGateway.emitTaskStatusChanged({
        taskId: task.id,
        oldStatus: TaskStatus.TIMEOUT,
        newStatus: TaskStatus.PENDING,
        timestamp: Date.now(),
      });

      await this.queuesService.enqueue(
        task.queueName,
        savedTask.id,
        taskDef.priority,
      );

      this.logger.log(`Task ${task.id} requeued after timeout (retry ${task.retries}/${taskDef.maxRetries})`);
    } else {
      task.status = TaskStatus.TIMEOUT;
      task.error = `Task timed out after ${taskDef?.timeout || 300} seconds, max retries exceeded`;
      task.completedAt = new Date();

      const savedTask = await this.taskInstanceRepository.save(task);
      this.eventsGateway.emitTaskStatusChanged({
        taskId: task.id,
        oldStatus,
        newStatus: TaskStatus.TIMEOUT,
        timestamp: Date.now(),
      });

      await this.queuesService.moveToDeadLetter(
        task.queueName,
        task.id,
        task.error,
      );

      savedTask.status = TaskStatus.FAILED;
      await this.taskInstanceRepository.save(savedTask);
      this.eventsGateway.emitTaskStatusChanged({
        taskId: task.id,
        oldStatus: TaskStatus.TIMEOUT,
        newStatus: TaskStatus.FAILED,
        timestamp: Date.now(),
      });

      this.logger.log(`Task ${task.id} moved to dead letter queue after timeout`);
    }
  }

  async checkWorkerHeartbeats(): Promise<void> {
    this.logger.log('Checking worker heartbeats...');

    const timeoutThreshold = new Date(
      Date.now() - WORKER_HEARTBEAT_TIMEOUT * 1000,
    );

    const offlineWorkers = await this.workerRepository.find({
      where: {
        lastHeartbeat: LessThan(timeoutThreshold),
      },
    });

    const activeWorkers = offlineWorkers.filter(
      (w) =>
        w.status !== WorkerStatus.SHUTDOWN &&
        w.status !== WorkerStatus.DISCONNECTED,
    );

    if (activeWorkers.length === 0) {
      this.logger.log('No offline workers detected');
      return;
    }

    this.logger.log(`Found ${activeWorkers.length} workers with heartbeat timeout`);

    for (const worker of activeWorkers) {
      await this.recoverWorkerTasks(worker);
    }
  }

  private async recoverWorkerTasks(worker: Worker): Promise<void> {
    this.logger.warn(`Worker ${worker.id} (${worker.name}) heartbeat timed out, recovering tasks`);

    const oldStatus = worker.status;
    worker.status = WorkerStatus.DISCONNECTED;
    await this.workerRepository.save(worker);
    this.logger.log(`Worker ${worker.id} marked as disconnected`);

    const runningTasks = await this.taskInstanceRepository.find({
      where: {
        workerId: worker.id,
        status: TaskStatus.RUNNING,
      },
    });

    this.logger.log(`Recovering ${runningTasks.length} running tasks from worker ${worker.id}`);

    for (const task of runningTasks) {
      await this.recoverTask(task);
    }
  }

  private async recoverTask(task: TaskInstance): Promise<void> {
    const oldStatus = task.status;
    const taskDefinitions = await this.taskDefinitionsService.findByName(
      task.taskDefinitionName,
    );
    const taskDef = taskDefinitions.find(
      (d) => d.version === task.taskVersion,
    );

    task.workerId = null;
    task.claimedAt = null;
    task.startedAt = null;

    if (taskDef && task.retries < taskDef.maxRetries) {
      task.retries += 1;
      task.status = TaskStatus.PENDING;
      task.error = `Worker disconnected, task recovered`;

      const savedTask = await this.taskInstanceRepository.save(task);
      this.eventsGateway.emitTaskStatusChanged({
        taskId: task.id,
        oldStatus,
        newStatus: TaskStatus.PENDING,
        timestamp: Date.now(),
      });

      await this.queuesService.enqueue(
        task.queueName,
        savedTask.id,
        taskDef.priority,
      );

      this.logger.log(`Task ${task.id} requeued after worker recovery (retry ${task.retries}/${taskDef.maxRetries})`);
    } else {
      task.status = TaskStatus.FAILED;
      task.error = `Worker disconnected, max retries exceeded`;
      task.completedAt = new Date();

      const savedTask = await this.taskInstanceRepository.save(task);
      this.eventsGateway.emitTaskStatusChanged({
        taskId: task.id,
        oldStatus,
        newStatus: TaskStatus.FAILED,
        timestamp: Date.now(),
      });

      await this.queuesService.moveToDeadLetter(
        task.queueName,
        task.id,
        task.error,
      );

      this.logger.log(`Task ${task.id} moved to dead letter queue after worker recovery`);
    }
  }
}
