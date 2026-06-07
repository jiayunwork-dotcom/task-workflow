import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertConditionType {
  QUEUE_DEPTH_EXCEEDED = 'queue_depth_exceeded',
  TASK_FAILURE_RATE_EXCEEDED = 'task_failure_rate_exceeded',
  WORKER_OFFLINE = 'worker_offline',
  TASK_EXECUTION_TIME_EXCEEDED = 'task_execution_time_exceeded',
}

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: AlertConditionType,
  })
  conditionType: AlertConditionType;

  @Column({ type: 'jsonb' })
  conditionParams: Record<string, any>;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARNING,
  })
  severity: AlertSeverity;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notificationChannels?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ruleId: string;

  @Column({ type: 'varchar', length: 255 })
  ruleName: string;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
  })
  severity: AlertSeverity;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  acknowledged: boolean;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  acknowledgedBy?: string;

  @CreateDateColumn()
  createdAt: Date;
}
