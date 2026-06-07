import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TaskInstance } from '../task-instances/entities/task-instance.entity';
import { TaskStatus, WorkerStatus } from '../common/enums';
import { QueuesService } from '../queues/queues.service';
import { WorkersService } from '../workers/workers.service';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(TaskInstance)
    private taskInstanceRepository: Repository<TaskInstance>,
    private queuesService: QueuesService,
    private workersService: WorkersService,
    @Inject('REDIS_CLIENT')
    private redis: any,
  ) {}

  async getOverallMetrics(): Promise<any> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalTasks,
      pendingTasks,
      runningTasks,
      successfulTasks,
      failedTasks,
      tasksLastHour,
      tasksLast24Hours,
      queueStats,
      workerStats,
    ] = await Promise.all([
      this.taskInstanceRepository.count(),
      this.taskInstanceRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.taskInstanceRepository.count({ where: { status: TaskStatus.RUNNING } }),
      this.taskInstanceRepository.count({ where: { status: TaskStatus.SUCCESS } }),
      this.taskInstanceRepository.count({ where: { status: TaskStatus.FAILED } }),
      this.taskInstanceRepository.count({
        where: { createdAt: Between(oneHourAgo, now) },
      }),
      this.taskInstanceRepository.count({
        where: { createdAt: Between(twentyFourHoursAgo, now) },
      }),
      this.getQueuesMetrics(),
      this.getWorkersMetrics(),
    ]);

    const totalCompleted = successfulTasks + failedTasks;
    const failureRate = totalCompleted > 0
      ? (failedTasks / totalCompleted) * 100
      : 0;

    return {
      summary: {
        totalTasks,
        pendingTasks,
        runningTasks,
        successfulTasks,
        failedTasks,
        failureRate: parseFloat(failureRate.toFixed(2)),
        tasksLastHour,
        tasksLast24Hours,
      },
      queues: queueStats,
      workers: workerStats,
    };
  }

  async getQueuesMetrics(): Promise<any[]> {
    const queues = await this.queuesService.findAll({ page: 1, limit: 100 });
    const metrics = [];

    for (const queue of queues.data) {
      const stats = await this.queuesService.getQueueStats(queue.name);
      metrics.push({
        name: queue.name,
        isPaused: queue.isPaused,
        concurrencyLimit: queue.concurrencyLimit,
        pendingCount: stats.pendingCount,
        delayedCount: stats.delayedCount,
        deadLetterCount: stats.deadLetterCount,
        runningCount: stats.runningCount,
        totalPending: stats.totalPending,
        depthThreshold: queue.depthThreshold,
        thresholdExceeded: stats.totalPending > queue.depthThreshold,
      });
    }

    return metrics;
  }

  async getWorkersMetrics(): Promise<any> {
    const workers = await this.workersService.findAll({ page: 1, limit: 100 });

    const totalWorkers = workers.total;
    const activeWorkers = workers.data.filter(
      (w) => w.status === WorkerStatus.RUNNING || w.status === WorkerStatus.IDLE,
    ).length;
    const disconnectedWorkers = workers.data.filter(
      (w) => w.status === WorkerStatus.DISCONNECTED,
    ).length;

    const avgCpuUsage = workers.data.length > 0
      ? workers.data.reduce((sum, w) => sum + (w.cpuUsage || 0), 0) / workers.data.length
      : 0;
    const avgMemoryUsage = workers.data.length > 0
      ? workers.data.reduce((sum, w) => sum + (w.memoryUsage || 0), 0) / workers.data.length
      : 0;
    const totalProcessedTasks = workers.data.reduce(
      (sum, w) => sum + w.processedTasks,
      0,
    );

    return {
      total: totalWorkers,
      active: activeWorkers,
      disconnected: disconnectedWorkers,
      avgCpuUsage: parseFloat(avgCpuUsage.toFixed(2)),
      avgMemoryUsage: parseFloat(avgMemoryUsage.toFixed(2)),
      totalProcessedTasks,
    };
  }

  async getTaskDurationMetrics(
    taskDefinitionName?: string,
    hours: number = 24,
  ): Promise<any> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const query = this.taskInstanceRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.SUCCESS })
      .andWhere('task.completedAt >= :since', { since })
      .andWhere('task.startedAt IS NOT NULL');

    if (taskDefinitionName) {
      query.andWhere('task.taskDefinitionName = :name', {
        name: taskDefinitionName,
      });
    }

    const tasks = await query.getMany();

    if (tasks.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const durations = tasks
      .map((t) => t.completedAt.getTime() - t.startedAt.getTime())
      .sort((a, b) => a - b);

    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * durations.length) - 1;
      return durations[Math.max(0, Math.min(index, durations.length - 1))];
    };

    return {
      count: durations.length,
      avgDuration: Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length,
      ),
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
    };
  }

  async getThroughputMetrics(hours: number = 24): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const tasks = await this.taskInstanceRepository
      .createQueryBuilder('task')
      .where('task.createdAt >= :since', { since })
      .select("DATE_TRUNC('hour', task.createdAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .addGroupBy("DATE_TRUNC('hour', task.createdAt)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    return tasks.map((t) => ({
      hour: t.hour,
      count: parseInt(t.count, 10),
    }));
  }
}
