import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { WorkerStatus } from '../../common/enums';

export class RegisterWorkerDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsArray()
  @IsString({ each: true })
  queues: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  concurrency?: number;
}

export class HeartbeatDto {
  @IsOptional()
  @IsNumber()
  cpuUsage?: number;

  @IsOptional()
  @IsNumber()
  memoryUsage?: number;
}

export class UpdateWorkerDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queues?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  concurrency?: number;

  @IsOptional()
  status?: WorkerStatus;
}
