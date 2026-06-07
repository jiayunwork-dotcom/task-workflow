import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { AlertSeverity, AlertConditionType } from '../entities/alert.entity';

export class CreateAlertRuleDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(AlertConditionType)
  conditionType: AlertConditionType;

  @IsObject()
  conditionParams: Record<string, any>;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notificationChannels?: string;
}

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsEnum(AlertConditionType)
  conditionType?: AlertConditionType;

  @IsOptional()
  @IsObject()
  conditionParams?: Record<string, any>;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notificationChannels?: string;
}
