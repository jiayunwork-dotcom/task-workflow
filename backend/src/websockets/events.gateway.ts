import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TaskStatus } from '../common/enums';

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

@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: '*',
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
}
