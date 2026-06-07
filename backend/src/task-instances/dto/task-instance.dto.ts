import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  Min,
  Max,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { TaskStatus } from '../../common/enums';

export class CreateTaskInstanceDto {
  @IsString()
  @MaxLength(255)
  taskDefinitionName: string;

  @IsOptional()
  taskVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  queueName?: string;

  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  delayedUntil?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  workflowInstanceId?: string;

  @IsOptional()
  @IsString()
  stepId?: string;
}

export class ClaimTaskDto {
  @IsString()
  workerId: string;

  @IsString()
  queueName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;
}

export class UpdateTaskProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;
}

export class CompleteTaskDto {
  @IsOptional()
  @IsObject()
  outputData?: Record<string, any>;
}

export class FailTaskDto {
  @IsString()
  error: string;

  @IsOptional()
  @IsObject()
  outputData?: Record<string, any>;
}
