import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

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

  dashboardUpdate$ = this.dashboardUpdateSubject.asObservable();
  taskUpdate$ = this.taskUpdateSubject.asObservable();
  taskStatusChanged$ = this.taskStatusChangedSubject.asObservable();
  workflowStepChanged$ = this.workflowStepChangedSubject.asObservable();

  constructor() {}

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
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
