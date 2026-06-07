import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ConcurrencyPolicy } from '../../common/enums';

@Entity('cron_jobs')
export class CronJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  cronExpression: string;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone: string;

  @Column({ type: 'uuid' })
  @Index()
  workflowDefinitionId: string;

  @Column({ type: 'jsonb', nullable: true })
  inputData?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ConcurrencyPolicy,
    default: ConcurrencyPolicy.SKIP,
  })
  concurrencyPolicy: ConcurrencyPolicy;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
