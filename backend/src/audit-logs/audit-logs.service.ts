import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogArchive } from './entities/audit-log-archive.entity';
import {
  CreateAuditLogDto,
  QueryAuditLogsDto,
  AuditLogStatsResponse,
  ActionTypeCount,
  HourlyDistribution,
  TopUser,
} from './dto/audit-log.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { EventsGateway } from '../websockets/events.gateway';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AuditLogArchive)
    private auditLogArchiveRepository: Repository<AuditLogArchive>,
    private dataSource: DataSource,
    private eventsGateway: EventsGateway,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create(createAuditLogDto);
      const saved = await this.auditLogRepository.save(auditLog);
      this.eventsGateway.emitAuditLogCreated(saved);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      throw error;
    }
  }

  async createAsync(createAuditLogDto: CreateAuditLogDto): Promise<void> {
    setImmediate(async () => {
      try {
        await this.create(createAuditLogDto);
      } catch (error) {
        this.logger.error(`Failed to create audit log asynchronously: ${error.message}`);
      }
    });
  }

  async findAll(
    queryDto: QueryAuditLogsDto,
  ): Promise<PaginatedResponseDto<AuditLog>> {
    const { page, limit, actionTypes, startTime, endTime, operator, resourceId } = queryDto;

    if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
      throw new BadRequestException('startTime cannot be later than endTime');
    }

    const where: any = {};

    if (actionTypes && actionTypes.length > 0) {
      where.actionType = In(actionTypes);
    }

    if (startTime && endTime) {
      where.createdAt = Between(new Date(startTime), new Date(endTime));
    } else if (startTime) {
      where.createdAt = Between(new Date(startTime), new Date());
    } else if (endTime) {
      const epoch = new Date(0);
      where.createdAt = Between(epoch, new Date(endTime));
    }

    if (operator) {
      where.operator = operator;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
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

  async findOne(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogRepository.findOne({
      where: { id },
    });
    if (!auditLog) {
      throw new BadRequestException(`AuditLog with ID "${id}" not found`);
    }
    return auditLog;
  }

  async getStats(startTime: string, endTime: string): Promise<AuditLogStatsResponse> {
    if (new Date(startTime) > new Date(endTime)) {
      throw new BadRequestException('startTime cannot be later than endTime');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const actionTypeCounts = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select('auditLog.actionType', 'actionType')
      .addSelect('COUNT(*)', 'count')
      .where('auditLog.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('auditLog.actionType')
      .getRawMany<ActionTypeCount>();

    const hourlyDistribution = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select("TO_CHAR(auditLog.createdAt, 'YYYY-MM-DD HH24:00')", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('auditLog.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy("TO_CHAR(auditLog.createdAt, 'YYYY-MM-DD HH24:00')")
      .orderBy('hour', 'ASC')
      .getRawMany<HourlyDistribution>();

    const topUsers = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select('auditLog.operator', 'operator')
      .addSelect('COUNT(*)', 'count')
      .where('auditLog.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('auditLog.operator')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<TopUser>();

    return {
      actionTypeCounts,
      hourlyDistribution,
      topUsers,
    };
  }

  async archiveOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.logger.log(`Starting audit log archive for logs older than ${cutoffDate.toISOString()}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldLogs = await queryRunner.manager.find(AuditLog, {
        where: {
          createdAt: Between(new Date(0), cutoffDate),
        },
        take: 1000,
      });

      if (oldLogs.length === 0) {
        this.logger.log('No old logs to archive');
        await queryRunner.commitTransaction();
        return 0;
      }

      const archiveEntities = oldLogs.map((log) => {
        const archive = new AuditLogArchive();
        Object.assign(archive, log);
        return archive;
      });

      await queryRunner.manager.save(AuditLogArchive, archiveEntities);

      const logIds = oldLogs.map((log) => log.id);
      await queryRunner.manager.delete(AuditLog, logIds);

      await queryRunner.commitTransaction();

      this.logger.log(`Successfully archived ${oldLogs.length} audit logs`);
      return oldLogs.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to archive audit logs: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
