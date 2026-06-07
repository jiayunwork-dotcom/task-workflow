import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsObject,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { RetryStrategy } from '../../common/enums';

export class CreateTaskDefinitionDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeout?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsEnum(RetryStrategy)
  retryStrategy?: RetryStrategy;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  queueName?: string;
}

export class UpdateTaskDefinitionDto {
  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeout?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsEnum(RetryStrategy)
  retryStrategy?: RetryStrategy;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  queueName?: string;

  @IsOptional()
  @IsBoolean()
  isDeprecated?: boolean;
}
