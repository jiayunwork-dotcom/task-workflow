import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from './entities/cron-job.entity';
import {
  CreateCronJobDto,
  UpdateCronJobDto,
  TriggerJobDto,
} from './dto/scheduler.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { ConcurrencyPolicy, WorkflowStatus } from '../common/enums';
import { WorkflowsService } from '../workflows/workflows.service';
import * as cronParser from 'cron-parser';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private runningJobs: Map<string, string[]> = new Map();

  constructor(
    @InjectRepository(CronJob)
    private cronJobRepository: Repository<CronJob>,
    private workflowsService: WorkflowsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Scheduler module initialized');
    await this.scheduleAllJobs();
  }

  private validateCronExpression(expression: string): void {
    try {
      cronParser.parseExpression(expression);
    } catch (e) {
      throw new BadRequestException(`Invalid cron expression: ${expression}`);
    }
  }

  private calculateNextRun(
    cronExpression: string,
    timezone: string,
  ): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        tz: timezone,
      });
      return interval.next().toDate();
    } catch (e) {
      return null;
    }
  }

  async create(createCronJobDto: CreateCronJobDto): Promise<CronJob> {
    const { name, cronExpression, timezone = 'UTC' } = createCronJobDto;

    this.validateCronExpression(cronExpression);

    const existing = await this.cronJobRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Cron job "${name}" already exists`);
    }

    const nextRunAt = this.calculateNextRun(cronExpression, timezone);

    const cronJob = this.cronJobRepository.create({
      ...createCronJobDto,
      timezone,
      nextRunAt,
    });

    return this.cronJobRepository.save(cronJob);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<CronJob>> {
    const { page, limit } = paginationDto;
    const [data, total] = await this.cronJobRepository.findAndCount({
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

  async findOne(id: string): Promise<CronJob> {
    const cronJob = await this.cronJobRepository.findOne({ where: { id } });
    if (!cronJob) {
      throw new NotFoundException(`Cron job with ID "${id}" not found`);
    }
    return cronJob;
  }

  async update(
    id: string,
    updateCronJobDto: UpdateCronJobDto,
  ): Promise<CronJob> {
    const cronJob = await this.findOne(id);

    if (updateCronJobDto.cronExpression) {
      this.validateCronExpression(updateCronJobDto.cronExpression);
    }

    Object.assign(cronJob, updateCronJobDto);

    if (updateCronJobDto.cronExpression || updateCronJobDto.timezone) {
      cronJob.nextRunAt = this.calculateNextRun(
        cronJob.cronExpression,
        cronJob.timezone,
      );
    }

    return this.cronJobRepository.save(cronJob);
  }

  async remove(id: string): Promise<void> {
    const cronJob = await this.findOne(id);
    await this.cronJobRepository.delete(id);
    this.runningJobs.delete(id);
  }

  async activate(id: string): Promise<CronJob> {
    const cronJob = await this.findOne(id);
    cronJob.isActive = true;
    cronJob.nextRunAt = this.calculateNextRun(
      cronJob.cronExpression,
      cronJob.timezone,
    );
    return this.cronJobRepository.save(cronJob);
  }

  async deactivate(id: string): Promise<CronJob> {
    const cronJob = await this.findOne(id);
    cronJob.isActive = false;
    cronJob.nextRunAt = null;
    return this.cronJobRepository.save(cronJob);
  }

  async trigger(
    id: string,
    triggerJobDto: TriggerJobDto,
  ): Promise<any> {
    const cronJob = await this.findOne(id);

    const inputData = triggerJobDto.inputData || cronJob.inputData;

    return this.executeJob(cronJob, inputData);
  }

  private async executeJob(
    cronJob: CronJob,
    inputData?: Record<string, any>,
  ): Promise<any> {
    const runningInstances = this.runningJobs.get(cronJob.id) || [];

    switch (cronJob.concurrencyPolicy) {
      case ConcurrencyPolicy.SKIP:
        if (runningInstances.length > 0) {
          this.logger.log(
            `Skipping job ${cronJob.name} due to running instances`,
          );
          return null;
        }
        break;

      case ConcurrencyPolicy.REPLACE:
        for (const instanceId of runningInstances) {
          try {
            await this.workflowsService.cancelInstance(instanceId);
          } catch (e) {
            this.logger.error(
              `Failed to cancel instance ${instanceId}: ${e.message}`,
            );
          }
        }
        this.runningJobs.set(cronJob.id, []);
        break;

      case ConcurrencyPolicy.QUEUE:
        break;
    }

    try {
      const workflowInstance = await this.workflowsService.startWorkflow(
        cronJob.workflowDefinitionId,
        { inputData },
      );

      const currentRunning = this.runningJobs.get(cronJob.id) || [];
      this.runningJobs.set(cronJob.id, [...currentRunning, workflowInstance.id]);

      cronJob.lastRunAt = new Date();
      cronJob.nextRunAt = this.calculateNextRun(
        cronJob.cronExpression,
        cronJob.timezone,
      );
      await this.cronJobRepository.save(cronJob);

      return workflowInstance;
    } catch (e) {
      this.logger.error(`Failed to execute job ${cronJob.name}: ${e.message}`);
      throw e;
    }
  }

  async checkAndRunDueJobs(): Promise<void> {
    const now = new Date();
    const dueJobs = await this.cronJobRepository
      .createQueryBuilder('job')
      .where('job.isActive = :isActive', { isActive: true })
      .andWhere('job.nextRunAt <= :now', { now })
      .getMany();

    for (const job of dueJobs) {
      try {
        await this.executeJob(job, job.inputData);
      } catch (e) {
        this.logger.error(`Failed to run job ${job.name}: ${e.message}`);
      }
    }
  }

  async scheduleAllJobs(): Promise<void> {
    const jobs = await this.cronJobRepository.find({
      where: { isActive: true },
    });

    for (const job of jobs) {
      if (!job.nextRunAt) {
        job.nextRunAt = this.calculateNextRun(
          job.cronExpression,
          job.timezone,
        );
        await this.cronJobRepository.save(job);
      }
    }
  }

  async cleanupCompletedJobs(): Promise<void> {
    for (const [jobId, instanceIds] of this.runningJobs.entries()) {
      const stillRunning: string[] = [];

      for (const instanceId of instanceIds) {
        try {
          const instance = await this.workflowsService.findOneInstance(
            instanceId,
          );
          if (
            instance.status === WorkflowStatus.RUNNING ||
            instance.status === WorkflowStatus.PENDING
          ) {
            stillRunning.push(instanceId);
          }
        } catch (e) {
          // Instance not found, remove from tracking
        }
      }

      if (stillRunning.length !== instanceIds.length) {
        this.runningJobs.set(jobId, stillRunning);
      }
    }
  }
}
