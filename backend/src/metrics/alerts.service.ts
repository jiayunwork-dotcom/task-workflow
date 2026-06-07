import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule, Alert, AlertSeverity, AlertConditionType } from './entities/alert.entity';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from './dto/metrics.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { MetricsService } from './metrics.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertRule)
    private alertRuleRepository: Repository<AlertRule>,
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    private metricsService: MetricsService,
  ) {}

  async createRule(
    createAlertRuleDto: CreateAlertRuleDto,
  ): Promise<AlertRule> {
    const rule = this.alertRuleRepository.create(createAlertRuleDto);
    return this.alertRuleRepository.save(rule);
  }

  async findAllRules(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<AlertRule>> {
    const { page, limit } = paginationDto;
    const [data, total] = await this.alertRuleRepository.findAndCount({
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

  async findOneRule(id: string): Promise<AlertRule> {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Alert rule with ID "${id}" not found`);
    }
    return rule;
  }

  async updateRule(
    id: string,
    updateAlertRuleDto: UpdateAlertRuleDto,
  ): Promise<AlertRule> {
    const rule = await this.findOneRule(id);
    Object.assign(rule, updateAlertRuleDto);
    return this.alertRuleRepository.save(rule);
  }

  async removeRule(id: string): Promise<void> {
    const rule = await this.findOneRule(id);
    await this.alertRuleRepository.delete(id);
  }

  async createAlert(
    rule: AlertRule,
    message: string,
    details?: Record<string, any>,
  ): Promise<Alert> {
    const alert = this.alertRepository.create({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message,
      details,
    });
    return this.alertRepository.save(alert);
  }

  async findAllAlerts(
    paginationDto: PaginationDto,
    acknowledged?: boolean,
    severity?: AlertSeverity,
  ): Promise<PaginatedResponseDto<Alert>> {
    const { page, limit } = paginationDto;
    const where: any = {};
    if (acknowledged !== undefined) where.acknowledged = acknowledged;
    if (severity) where.severity = severity;

    const [data, total] = await this.alertRepository.findAndCount({
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

  async findOneAlert(id: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Alert with ID "${id}" not found`);
    }
    return alert;
  }

  async acknowledgeAlert(id: string, userId: string): Promise<Alert> {
    const alert = await this.findOneAlert(id);
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;
    return this.alertRepository.save(alert);
  }

  async evaluateRules(): Promise<void> {
    this.logger.debug('Evaluating alert rules');

    const rules = await this.alertRuleRepository.find({
      where: { isActive: true },
    });

    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (e) {
        this.logger.error(
          `Error evaluating rule ${rule.name}: ${e.message}`,
        );
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    switch (rule.conditionType) {
      case AlertConditionType.QUEUE_DEPTH_EXCEEDED:
        await this.evaluateQueueDepthRule(rule);
        break;
      case AlertConditionType.TASK_FAILURE_RATE_EXCEEDED:
        await this.evaluateFailureRateRule(rule);
        break;
      case AlertConditionType.WORKER_OFFLINE:
        await this.evaluateWorkerOfflineRule(rule);
        break;
      case AlertConditionType.TASK_EXECUTION_TIME_EXCEEDED:
        await this.evaluateExecutionTimeRule(rule);
        break;
    }
  }

  private async evaluateQueueDepthRule(rule: AlertRule): Promise<void> {
    const queueMetrics = await this.metricsService.getQueuesMetrics();
    const threshold = rule.conditionParams.threshold || 1000;

    for (const queue of queueMetrics) {
      if (queue.totalPending > threshold) {
        await this.createAlert(
          rule,
          `Queue "${queue.name}" depth exceeded threshold: ${queue.totalPending} > ${threshold}`,
          { queue: queue.name, depth: queue.totalPending, threshold },
        );
      }
    }
  }

  private async evaluateFailureRateRule(rule: AlertRule): Promise<void> {
    const metrics = await this.metricsService.getOverallMetrics();
    const threshold = rule.conditionParams.threshold || 5;

    if (metrics.summary.failureRate > threshold) {
      await this.createAlert(
        rule,
        `Task failure rate exceeded threshold: ${metrics.summary.failureRate}% > ${threshold}%`,
        { failureRate: metrics.summary.failureRate, threshold },
      );
    }
  }

  private async evaluateWorkerOfflineRule(rule: AlertRule): Promise<void> {
    const workerMetrics = await this.metricsService.getWorkersMetrics();
    const threshold = rule.conditionParams.threshold || 1;

    if (workerMetrics.disconnected >= threshold) {
      await this.createAlert(
        rule,
        `Disconnected workers exceeded threshold: ${workerMetrics.disconnected} >= ${threshold}`,
        {
          disconnected: workerMetrics.disconnected,
          total: workerMetrics.total,
          threshold,
        },
      );
    }
  }

  private async evaluateExecutionTimeRule(rule: AlertRule): Promise<void> {
    const taskName = rule.conditionParams.taskDefinitionName;
    const threshold = rule.conditionParams.threshold || 30000;

    const metrics = await this.metricsService.getTaskDurationMetrics(taskName);

    if (metrics.p95 > threshold) {
      await this.createAlert(
        rule,
        `Task execution time P95 exceeded threshold: ${metrics.p95}ms > ${threshold}ms`,
        {
          taskDefinitionName: taskName || 'all',
          p95: metrics.p95,
          threshold,
        },
      );
    }
  }
}
