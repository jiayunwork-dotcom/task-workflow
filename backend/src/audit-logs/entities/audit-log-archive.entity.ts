import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { AuditLogType, AuditResourceType } from '../../common/enums';

@Entity('audit_log_archive')
export class AuditLogArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuditLogType,
  })
  @Index()
  actionType: AuditLogType;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  operator: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  resourceId?: string;

  @Column({
    type: 'enum',
    enum: AuditResourceType,
    nullable: true,
  })
  @Index()
  resourceType?: AuditResourceType;

  @Column({ type: 'jsonb', nullable: true })
  beforeSnapshot?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  afterSnapshot?: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent?: string;

  @Column({ type: 'bigint', nullable: true })
  durationMs?: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
