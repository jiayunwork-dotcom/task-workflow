import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { WorkerStatus } from '../../common/enums';

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name: string;

  @Column({ type: 'jsonb' })
  queues: string[];

  @Column({ type: 'int', default: 1 })
  concurrency: number;

  @Column({
    type: 'enum',
    enum: WorkerStatus,
    default: WorkerStatus.IDLE,
  })
  @Index()
  status: WorkerStatus;

  @Column({ type: 'float', nullable: true })
  cpuUsage: number;

  @Column({ type: 'float', nullable: true })
  memoryUsage: number;

  @Column({ type: 'int', default: 0 })
  processedTasks: number;

  @Column({ type: 'timestamp' })
  @Index()
  lastHeartbeat: Date;

  @CreateDateColumn()
  registeredAt: Date;
}
