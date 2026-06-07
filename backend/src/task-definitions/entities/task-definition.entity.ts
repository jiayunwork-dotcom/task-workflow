import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { RetryStrategy } from '../../common/enums';

@Entity('task_definitions')
@Index(['name', 'version'], { unique: true })
export class TaskDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  inputSchema: Record<string, any>;

  @Column({ type: 'int', default: 300 })
  timeout: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({
    type: 'enum',
    enum: RetryStrategy,
    default: RetryStrategy.EXPONENTIAL_WITH_JITTER,
  })
  retryStrategy: RetryStrategy;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'varchar', length: 255, default: 'default' })
  queueName: string;

  @Column({ type: 'boolean', default: false })
  isDeprecated: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
