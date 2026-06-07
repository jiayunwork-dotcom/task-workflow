export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'parallel' | 'wait';
  queue: string;
  timeout?: number;
  retryCount: number;
  dependsOn: string[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  steps: WorkflowStepInstance[];
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface WorkflowStepInstance {
  id: string;
  stepId: string;
  stepName: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  taskId?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  error?: string;
  logs?: string[];
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

export interface Task {
  id: string;
  workflowId?: string;
  workflowInstanceId?: string;
  stepId?: string;
  queue: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED' | 'TIMEOUT' | 'CLAIMED';
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  error?: string;
  workerId?: string;
  priority: number;
  retryCount: number;
  maxRetryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  executeHistory?: TaskExecution[];
}

export interface TaskExecution {
  workerId: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface Queue {
  name: string;
  displayName: string;
  depth: number;
  pendingCount: number;
  runningCount: number;
  deadLetterCount: number;
  isPaused: boolean;
  maxRetries: number;
  visibilityTimeout: number;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  queues: string[];
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  cpuUsage: number;
  memoryUsage: number;
  processedTasks: number;
  failedTasks: number;
  lastHeartbeat: string;
  currentTaskId?: string;
  ipAddress: string;
}

export interface CronJob {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  workflowId: string;
  workflowName: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  inputData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CronJobHistory {
  id: string;
  cronJobId: string;
  workflowInstanceId: string;
  status: 'SUCCESS' | 'FAILED';
  triggeredAt: string;
  completedAt?: string;
  error?: string;
}

export interface Alert {
  id: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  source: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  activeWorkers: number;
  totalQueues: number;
  totalDepth: number;
  tasksCompletedLastHour: number;
  tasksFailedLastHour: number;
  pendingAlerts: number;
}

export interface QueueDepthItem {
  name: string;
  value: number;
}

export interface TaskTrendItem {
  time: string;
  completed: number;
  failed: number;
}

export interface DagNode {
  id: string;
  label: string;
  status?: string;
  x?: number;
  y?: number;
}

export interface DagEdge {
  source: string;
  target: string;
}

export interface DagGraph {
  nodes: DagNode[];
  edges: DagEdge[];
}

export type AuditLogType =
  | 'TASK_CREATED'
  | 'TASK_CLAIMED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_TIMEOUT'
  | 'TASK_REQUEUED'
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_CANCELLED'
  | 'WORKER_ONLINE'
  | 'WORKER_OFFLINE'
  | 'QUEUE_PAUSED'
  | 'QUEUE_RESUMED'
  | 'CRON_TRIGGERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'CONFIG_CHANGED';

export type AuditResourceType = 'TASK' | 'WORKFLOW' | 'WORKER' | 'QUEUE' | 'CRON' | 'USER';

export interface AuditLog {
  id: string;
  actionType: AuditLogType;
  operator: string;
  resourceId?: string;
  resourceType?: AuditResourceType;
  beforeSnapshot?: Record<string, any>;
  afterSnapshot?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  createdAt: string;
}

export interface ActionTypeCount {
  actionType: AuditLogType;
  count: number;
}

export interface HourlyDistribution {
  hour: string;
  count: number;
}

export interface TopUser {
  operator: string;
  count: number;
}

export interface AuditLogStats {
  actionTypeCounts: ActionTypeCount[];
  hourlyDistribution: HourlyDistribution[];
  topUsers: TopUser[];
}

export interface AuditLogCreatedEvent {
  id: string;
  actionType: AuditLogType;
  operator: string;
  resourceId?: string;
  resourceType?: AuditResourceType;
  beforeSnapshot?: Record<string, any>;
  afterSnapshot?: Record<string, any>;
  ipAddress?: string;
  durationMs?: number;
  createdAt: string;
  timestamp: number;
}
