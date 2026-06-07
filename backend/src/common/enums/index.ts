export enum TaskStatus {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum RetryStrategy {
  FIXED = 'fixed',
  EXPONENTIAL = 'exponential',
  EXPONENTIAL_WITH_JITTER = 'exponential_with_jitter',
}

export enum WorkerStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  DISCONNECTED = 'disconnected',
  SHUTDOWN = 'shutdown',
}

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ConcurrencyPolicy {
  SKIP = 'skip',
  QUEUE = 'queue',
  REPLACE = 'replace',
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export enum AuditLogType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_CLAIMED = 'TASK_CLAIMED',
  TASK_STARTED = 'TASK_STARTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_FAILED = 'TASK_FAILED',
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  TASK_REQUEUED = 'TASK_REQUEUED',
  WORKFLOW_STARTED = 'WORKFLOW_STARTED',
  WORKFLOW_COMPLETED = 'WORKFLOW_COMPLETED',
  WORKFLOW_CANCELLED = 'WORKFLOW_CANCELLED',
  WORKER_ONLINE = 'WORKER_ONLINE',
  WORKER_OFFLINE = 'WORKER_OFFLINE',
  QUEUE_PAUSED = 'QUEUE_PAUSED',
  QUEUE_RESUMED = 'QUEUE_RESUMED',
  CRON_TRIGGERED = 'CRON_TRIGGERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  CONFIG_CHANGED = 'CONFIG_CHANGED',
}

export enum AuditResourceType {
  TASK = 'TASK',
  WORKFLOW = 'WORKFLOW',
  WORKER = 'WORKER',
  QUEUE = 'QUEUE',
  CRON = 'CRON',
  USER = 'USER',
}
