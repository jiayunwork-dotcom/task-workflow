import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ConcurrencyPolicy } from '../../common/enums';

export class CreateCronJobDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  cronExpression: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsString()
  workflowDefinitionId: string;

  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>;

  @IsOptional()
  @IsEnum(ConcurrencyPolicy)
  concurrencyPolicy?: ConcurrencyPolicy;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCronJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cronExpression?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>;

  @IsOptional()
  @IsEnum(ConcurrencyPolicy)
  concurrencyPolicy?: ConcurrencyPolicy;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TriggerJobDto {
  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>;
}
