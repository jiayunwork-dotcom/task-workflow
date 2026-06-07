import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { WorkersService } from '../workers/workers.service';

@Injectable()
export class SchedulerTasksService {
  private readonly logger = new Logger(SchedulerTasksService.name);

  constructor(
    private schedulerService: SchedulerService,
    private workersService: WorkersService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async checkDueJobs() {
    try {
      await this.schedulerService.checkAndRunDueJobs();
    } catch (e) {
      this.logger.error(`Error checking due jobs: ${e.message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkDisconnectedWorkers() {
    try {
      await this.workersService.checkAndMarkDisconnected();
    } catch (e) {
      this.logger.error(`Error checking disconnected workers: ${e.message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupCompletedJobs() {
    try {
      await this.schedulerService.cleanupCompletedJobs();
    } catch (e) {
      this.logger.error(`Error cleaning up completed jobs: ${e.message}`);
    }
  }
}
