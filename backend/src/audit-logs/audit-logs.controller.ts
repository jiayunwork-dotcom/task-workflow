import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto, AuditLogStatsDto, AuditLogStatsResponse } from './dto/audit-log.dto';
import { AuditLog } from './entities/audit-log.entity';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @Query() queryDto: QueryAuditLogsDto,
  ): Promise<PaginatedResponseDto<AuditLog>> {
    return this.auditLogsService.findAll(queryDto);
  }

  @Get('stats')
  async getStats(
    @Query() statsDto: AuditLogStatsDto,
  ): Promise<AuditLogStatsResponse> {
    return this.auditLogsService.getStats(statsDto.startTime, statsDto.endTime);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AuditLog> {
    return this.auditLogsService.findOne(id);
  }
}
