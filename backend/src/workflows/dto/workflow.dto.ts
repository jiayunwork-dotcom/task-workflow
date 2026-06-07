import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Step, LoopConfig } from '../entities/workflow-definition.entity';

class LoopConfigDto implements LoopConfig {
  @IsString()
  type: 'for' | 'while';

  @IsOptional()
  iterations?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  maxIterations?: number;
}

class StepDto implements Step {
  @IsString()
  @MaxLength(255)
  id: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsString()
  @MaxLength(255)
  taskDefinitionName: string;

  @IsOptional()
  taskVersion?: number;

  @IsArray()
  @IsString({ each: true })
  dependsOn: string[];

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LoopConfigDto)
  loopConfig?: LoopConfigDto;

  @IsOptional()
  @IsObject()
  inputMapping?: Record<string, string>;

  @IsOptional()
  @IsString()
  outputKey?: string;
}

export class CreateWorkflowDefinitionDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: Step[];
}

export class UpdateWorkflowDefinitionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps?: Step[];
}

export class StartWorkflowDto {
  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>;
}

export class UpdateStepStatusDto {
  @IsString()
  stepId: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsObject()
  output?: any;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  taskInstanceId?: string;
}
