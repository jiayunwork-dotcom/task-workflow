import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowStatus, StepStatus } from '../../common/enums';

export interface StepStatusInfo {
  status: StepStatus;
  taskInstanceId?: string;
  startedAt?: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
  iteration?: number;
}

export interface StepsStatusMap {
  [stepId: string]: StepStatusInfo;
}

@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  workflowDefinitionId: string;

  @ManyToOne(() => WorkflowDefinition, (def) => def.instances)
  @JoinColumn({ name: 'workflowDefinitionId' })
  workflowDefinition: WorkflowDefinition;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.PENDING,
  })
  @Index()
  status: WorkflowStatus;

  @Column({ type: 'jsonb', default: {} })
  stepsStatus: StepsStatusMap;

  @Column({ type: 'jsonb', nullable: true })
  inputData?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  outputData?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
