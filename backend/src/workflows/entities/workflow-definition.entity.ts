import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';

export interface LoopConfig {
  type: 'for' | 'while';
  iterations?: number;
  condition?: string;
  maxIterations?: number;
}

export interface Step {
  id: string;
  name?: string;
  taskDefinitionName: string;
  taskVersion?: number;
  dependsOn: string[];
  condition?: string;
  loopConfig?: LoopConfig;
  inputMapping?: Record<string, string>;
  outputKey?: string;
}

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'jsonb' })
  steps: Step[];

  @Column({ type: 'jsonb', nullable: true })
  dag?: Record<string, string[]>;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkflowInstance, (instance) => instance.workflowDefinition)
  instances: WorkflowInstance[];
}
