import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
  IsInt,
  Min,
  Max,
  ValidateIf,
  IsArray,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditLogType, AuditResourceType } from '../../common/enums';

export class CreateAuditLogDto {
  @IsEnum(AuditLogType)
  actionType: AuditLogType;

  @IsString()
  operator: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsEnum(AuditResourceType)
  resourceType?: AuditResourceType;

  @IsOptional()
  beforeSnapshot?: Record<string, any>;

  @IsOptional()
  afterSnapshot?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsInt()
  durationMs?: number;
}

export class QueryAuditLogsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(AuditLogType, { each: true })
  @Type(() => String)
  actionTypes?: AuditLogType[];

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class AuditLogStatsDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export interface ActionTypeCount {
  actionType: AuditLogType;
  count: number;
}

export interface HourlyDistribution {
  hour: string;
  count: number;
}

export interface TopUser {
  operator: string;
  count: number;
}

export interface AuditLogStatsResponse {
  actionTypeCounts: ActionTypeCount[];
  hourlyDistribution: HourlyDistribution[];
  topUsers: TopUser[];
}
