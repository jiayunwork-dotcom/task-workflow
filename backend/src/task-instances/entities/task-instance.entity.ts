import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { TaskStatus } from '../../common/enums';

@Entity('task_instances')
export class TaskInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  taskDefinitionName: string;

  @Column({ type: 'int' })
  taskVersion: number;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  queueName: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  @Index()
  status: TaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  inputData?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  outputData?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'int', default: 0 })
  retries: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  workerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workflowInstanceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stepId?: string;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  delayedUntil?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
