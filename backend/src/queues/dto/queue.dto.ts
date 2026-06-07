import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateQueueDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  concurrencyLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  depthThreshold?: number;
}

export class UpdateQueueDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  concurrencyLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  depthThreshold?: number;
}
