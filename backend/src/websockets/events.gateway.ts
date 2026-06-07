import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TaskStatus, AuditLogType, AuditResourceType } from '../common/enums';

export interface TaskStatusChangedPayload {
  taskId: string;
  oldStatus: TaskStatus | null;
  newStatus: TaskStatus;
  timestamp: number;
}

export interface WorkflowStepChangedPayload {
  workflowInstanceId: string;
  stepId: string;
  oldStatus: string | null;
  newStatus: string;
  timestamp?: number;
}

export interface AuditLogCreatedPayload {
  id: string;
  actionType: AuditLogType;
  operator: string;
  resourceId?: string;
  resourceType?: AuditResourceType;
  beforeSnapshot?: Record<string, any>;
  afterSnapshot?: Record<string, any>;
  ipAddress?: string;
  durationMs?: number;
  createdAt: Date;
}

@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  emitTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    this.server.emit('task:statusChanged', {
      ...payload,
      timestamp: payload.timestamp || Date.now(),
    });
  }

  emitWorkflowStepChanged(payload: WorkflowStepChangedPayload): void {
    this.server.emit('workflow:stepChanged', {
      ...payload,
      timestamp: payload.timestamp || Date.now(),
    });
  }

  emitAuditLogCreated(payload: AuditLogCreatedPayload): void {
    this.server.emit('auditLog:created', {
      ...payload,
      timestamp: Date.now(),
    });
  }
}
