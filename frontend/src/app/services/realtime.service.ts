import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuditLogCreatedEvent } from '../models';

export interface TaskStatusChangedEvent {
  taskId: string;
  oldStatus: string | null;
  newStatus: string;
  timestamp: number;
}

export interface WorkflowStepChangedEvent {
  workflowInstanceId: string;
  stepId: string;
  oldStatus: string | null;
  newStatus: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: Socket;
  private dashboardUpdateSubject = new Subject<void>();
  private taskUpdateSubject = new Subject<void>();
  private taskStatusChangedSubject = new Subject<TaskStatusChangedEvent>();
  private workflowStepChangedSubject = new Subject<WorkflowStepChangedEvent>();
  private auditLogCreatedSubject = new Subject<AuditLogCreatedEvent>();

  dashboardUpdate$ = this.dashboardUpdateSubject.asObservable();
  taskUpdate$ = this.taskUpdateSubject.asObservable();
  taskStatusChanged$ = this.taskStatusChangedSubject.asObservable();
  workflowStepChanged$ = this.workflowStepChangedSubject.asObservable();
  auditLogCreated$ = this.auditLogCreatedSubject.asObservable();

  constructor() {}

  connect(): void {
    if (this.socket?.connected) return;

    const socketOptions: any = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    };

    if (environment.production) {
      this.socket = io(socketOptions);
    } else {
      this.socket = io(environment.wsUrl, socketOptions);
    }

    this.socket.on('connect', () => {
      console.log('WebSocket connected, socket id:', this.socket?.id);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error.message || error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected, reason:', reason);
    });

    this.socket.on('task:statusChanged', (data: TaskStatusChangedEvent) => {
      console.log('Task status changed:', data);
      this.taskStatusChangedSubject.next(data);
      this.dashboardUpdateSubject.next();
      this.taskUpdateSubject.next();
    });

    this.socket.on('workflow:stepChanged', (data: WorkflowStepChangedEvent) => {
      console.log('Workflow step changed:', data);
      this.workflowStepChangedSubject.next(data);
      this.dashboardUpdateSubject.next();
    });

    this.socket.on('auditLog:created', (data: AuditLogCreatedEvent) => {
      console.log('Audit log created:', data);
      this.auditLogCreatedSubject.next(data);
      this.dashboardUpdateSubject.next();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  startPolling(): void {
    this.connect();
  }

  stopPolling(): void {
    this.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
