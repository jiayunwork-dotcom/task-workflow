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
