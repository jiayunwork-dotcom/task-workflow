import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('queues')
export class Queue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'int', default: 10 })
  concurrencyLimit: number;

  @Column({ type: 'int', nullable: true })
  rateLimitPerMinute: number;

  @Column({ type: 'boolean', default: false })
  isPaused: boolean;

  @Column({ type: 'int', default: 10000 })
  depthThreshold: number;

  @CreateDateColumn()
  createdAt: Date;
}
