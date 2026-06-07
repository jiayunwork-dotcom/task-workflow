import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  WorkflowDefinition,
  WorkflowInstance,
  Task,
  Queue,
  Worker,
  CronJob,
  CronJobHistory,
  Alert,
  DashboardStats,
  QueueDepthItem,
  TaskTrendItem
} from '../models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private workflows: WorkflowDefinition[] = [
    {
      id: 'wf-001',
      name: '订单处理工作流',
      description: '处理用户订单的完整流程',
      version: 2,
      steps: [
        { id: 'step-1', name: '创建订单', type: 'task', queue: 'order', retryCount: 3, dependsOn: [] },
        { id: 'step-2', name: '扣减库存', type: 'task', queue: 'inventory', retryCount: 3, dependsOn: ['step-1'] },
        { id: 'step-3', name: '支付处理', type: 'task', queue: 'payment', retryCount: 5, dependsOn: ['step-1'] },
        { id: 'step-4', name: '发货通知', type: 'task', queue: 'notification', retryCount: 3, dependsOn: ['step-2', 'step-3'] }
      ],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      isActive: true
    },
    {
      id: 'wf-002',
      name: '数据同步工作流',
      description: '跨系统数据同步流程',
      version: 1,
      steps: [
        { id: 'step-1', name: '源数据提取', type: 'task', queue: 'etl', retryCount: 3, dependsOn: [] },
        { id: 'step-2', name: '数据转换', type: 'task', queue: 'etl', retryCount: 3, dependsOn: ['step-1'] },
        { id: 'step-3', name: '目标写入', type: 'task', queue: 'etl', retryCount: 5, dependsOn: ['step-2'] }
      ],
      createdAt: '2024-01-10T08:00:00Z',
      updatedAt: '2024-01-10T08:00:00Z',
      isActive: true
    },
    {
      id: 'wf-003',
      name: '用户注册审核',
      description: '新用户注册审核流程',
      version: 3,
      steps: [
        { id: 'step-1', name: '资料校验', type: 'task', queue: 'user', retryCount: 1, dependsOn: [] },
        { id: 'step-2', name: '人工审核', type: 'wait', queue: 'user', retryCount: 0, dependsOn: ['step-1'] },
        { id: 'step-3', name: '发送欢迎邮件', type: 'task', queue: 'notification', retryCount: 3, dependsOn: ['step-2'] }
      ],
      createdAt: '2024-01-05T09:00:00Z',
      updatedAt: '2024-01-25T16:00:00Z',
      isActive: false
    }
  ];

  private tasks: Task[] = Array.from({ length: 50 }, (_, i) => {
    const statuses: Task['status'][] = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'DEAD_LETTER'];
    const queues = ['order', 'inventory', 'payment', 'notification', 'etl', 'user'];
    const status = statuses[i % statuses.length];
    return {
      id: `task-${String(i + 1).padStart(3, '0')}`,
      queue: queues[i % queues.length],
      status,
      priority: Math.floor(Math.random() * 10) + 1,
      retryCount: Math.floor(Math.random() * 3),
      maxRetryCount: 5,
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      startedAt: status !== 'PENDING' ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
      completedAt: ['SUCCESS', 'FAILED', 'DEAD_LETTER'].includes(status) ? new Date(Date.now() - Math.random() * 1800000).toISOString() : undefined,
      error: status === 'FAILED' ? 'Timeout after 300s' : undefined,
      workerId: ['RUNNING', 'SUCCESS', 'FAILED'].includes(status) ? `worker-${(i % 5) + 1}` : undefined,
      inputData: { orderId: `ORD${10000 + i}`, amount: Math.floor(Math.random() * 10000) },
      outputData: status === 'SUCCESS' ? { result: 'ok', transactionId: `TXN${20000 + i}` } : undefined
    };
  });

  private queues: Queue[] = [
    { name: 'order', displayName: '订单队列', depth: 156, pendingCount: 150, runningCount: 6, deadLetterCount: 3, isPaused: false, maxRetries: 5, visibilityTimeout: 300, createdAt: '2024-01-01T00:00:00Z' },
    { name: 'inventory', displayName: '库存队列', depth: 89, pendingCount: 85, runningCount: 4, deadLetterCount: 1, isPaused: false, maxRetries: 3, visibilityTimeout: 180, createdAt: '2024-01-01T00:00:00Z' },
    { name: 'payment', displayName: '支付队列', depth: 42, pendingCount: 40, runningCount: 2, deadLetterCount: 0, isPaused: false, maxRetries: 5, visibilityTimeout: 600, createdAt: '2024-01-01T00:00:00Z' },
    { name: 'notification', displayName: '通知队列', depth: 234, pendingCount: 230, runningCount: 4, deadLetterCount: 8, isPaused: false, maxRetries: 3, visibilityTimeout: 120, createdAt: '2024-01-01T00:00:00Z' },
    { name: 'etl', displayName: 'ETL队列', depth: 67, pendingCount: 65, runningCount: 2, deadLetterCount: 2, isPaused: true, maxRetries: 5, visibilityTimeout: 1200, createdAt: '2024-01-01T00:00:00Z' },
    { name: 'user', displayName: '用户队列', depth: 28, pendingCount: 27, runningCount: 1, deadLetterCount: 0, isPaused: false, maxRetries: 3, visibilityTimeout: 300, createdAt: '2024-01-01T00:00:00Z' }
  ];

  private workers: Worker[] = [
    { id: 'worker-1', name: 'Worker-01', queues: ['order', 'payment'], status: 'ONLINE', cpuUsage: 45, memoryUsage: 62, processedTasks: 1256, failedTasks: 23, lastHeartbeat: new Date().toISOString(), ipAddress: '192.168.1.101' },
    { id: 'worker-2', name: 'Worker-02', queues: ['order', 'inventory'], status: 'BUSY', cpuUsage: 87, memoryUsage: 78, processedTasks: 2341, failedTasks: 45, lastHeartbeat: new Date().toISOString(), currentTaskId: 'task-002', ipAddress: '192.168.1.102' },
    { id: 'worker-3', name: 'Worker-03', queues: ['notification', 'user'], status: 'ONLINE', cpuUsage: 23, memoryUsage: 45, processedTasks: 876, failedTasks: 12, lastHeartbeat: new Date().toISOString(), ipAddress: '192.168.1.103' },
    { id: 'worker-4', name: 'Worker-04', queues: ['etl', 'notification'], status: 'OFFLINE', cpuUsage: 0, memoryUsage: 0, processedTasks: 5432, failedTasks: 89, lastHeartbeat: new Date(Date.now() - 300000).toISOString(), ipAddress: '192.168.1.104' },
    { id: 'worker-5', name: 'Worker-05', queues: ['payment', 'user'], status: 'ONLINE', cpuUsage: 56, memoryUsage: 55, processedTasks: 1876, failedTasks: 34, lastHeartbeat: new Date().toISOString(), ipAddress: '192.168.1.105' }
  ];

  private cronJobs: CronJob[] = [
    { id: 'cron-001', name: '每日数据备份', description: '每天凌晨2点执行数据备份', cronExpression: '0 0 2 * * ?', workflowId: 'wf-002', workflowName: '数据同步工作流', isActive: true, lastRunAt: new Date(Date.now() - 86400000).toISOString(), nextRunAt: new Date(Date.now() + 86400000).toISOString(), createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'cron-002', name: '每小时报表生成', description: '每小时生成运营报表', cronExpression: '0 0 * * * ?', workflowId: 'wf-002', workflowName: '数据同步工作流', isActive: true, lastRunAt: new Date(Date.now() - 3600000).toISOString(), nextRunAt: new Date(Date.now() + 3600000).toISOString(), createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
    { id: 'cron-003', name: '每周数据清理', description: '每周日凌晨3点清理过期数据', cronExpression: '0 0 3 ? * SUN', workflowId: 'wf-003', workflowName: '用户注册审核', isActive: false, lastRunAt: new Date(Date.now() - 604800000).toISOString(), nextRunAt: undefined, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' }
  ];

  private alerts: Alert[] = [
    { id: 'alert-001', level: 'CRITICAL', title: '队列积压告警', message: '订单队列深度超过100，当前深度156', source: 'monitor', isRead: false, createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'alert-002', level: 'ERROR', title: 'Worker离线', message: 'Worker-04已离线超过5分钟', source: 'monitor', isRead: false, createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'alert-003', level: 'WARNING', title: '任务失败率过高', message: '支付队列最近1小时失败率超过5%', source: 'monitor', isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'alert-004', level: 'INFO', title: '系统升级完成', message: '系统已升级到v1.2.0版本', source: 'system', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() }
  ];

  getDashboardStats(): Observable<DashboardStats> {
    return of({
      activeWorkers: 4,
      totalQueues: 6,
      totalDepth: 616,
      tasksCompletedLastHour: 234,
      tasksFailedLastHour: 12,
      pendingAlerts: 2
    }).pipe(delay(200));
  }

  getQueueDepths(): Observable<QueueDepthItem[]> {
    return of(this.queues.map(q => ({ name: q.displayName, value: q.depth }))).pipe(delay(200));
  }

  getTaskTrend(): Observable<TaskTrendItem[]> {
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const time = new Date(now.getTime() - (11 - i) * 300000);
      return {
        time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        completed: Math.floor(Math.random() * 50) + 20,
        failed: Math.floor(Math.random() * 10)
      };
    });
    return of(data).pipe(delay(200));
  }

  getAlerts(params?: { limit?: number; unreadOnly?: boolean }): Observable<Alert[]> {
    let alerts = [...this.alerts];
    if (params?.unreadOnly) alerts = alerts.filter(a => !a.isRead);
    if (params?.limit) alerts = alerts.slice(0, params.limit);
    return of(alerts).pipe(delay(100));
  }

  getWorkflows(params?: { page?: number; size?: number }): Observable<{ items: WorkflowDefinition[]; total: number }> {
    let items = [...this.workflows];
    const total = items.length;
    if (params?.page !== undefined && params?.size !== undefined) {
      const start = params.page * params.size;
      items = items.slice(start, start + params.size);
    }
    return of({ items, total }).pipe(delay(200));
  }

  getWorkflow(id: string): Observable<WorkflowDefinition | undefined> {
    return of(this.workflows.find(w => w.id === id)).pipe(delay(100));
  }

  createWorkflow(workflow: Partial<WorkflowDefinition>): Observable<WorkflowDefinition> {
    const newWorkflow: WorkflowDefinition = {
      id: `wf-${Date.now()}`,
      name: workflow.name || '',
      description: workflow.description || '',
      version: 1,
      steps: workflow.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: workflow.isActive !== undefined ? workflow.isActive : true
    };
    this.workflows.unshift(newWorkflow);
    return of(newWorkflow).pipe(delay(200));
  }

  updateWorkflow(id: string, workflow: Partial<WorkflowDefinition>): Observable<WorkflowDefinition | undefined> {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index !== -1) {
      this.workflows[index] = { ...this.workflows[index], ...workflow, updatedAt: new Date().toISOString(), version: this.workflows[index].version + 1 };
      return of(this.workflows[index]).pipe(delay(200));
    }
    return of(undefined).pipe(delay(200));
  }

  deleteWorkflow(id: string): Observable<void> {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index !== -1) this.workflows.splice(index, 1);
    return of(void 0).pipe(delay(200));
  }

  triggerWorkflow(id: string, inputData?: Record<string, any>): Observable<WorkflowInstance> {
    const workflow = this.workflows.find(w => w.id === id);
    const instance: WorkflowInstance = {
      id: `inst-${Date.now()}`,
      workflowId: id,
      workflowName: workflow?.name || '',
      status: 'RUNNING',
      steps: workflow?.steps.map(s => ({
        id: `inst-step-${s.id}`,
        stepId: s.id,
        stepName: s.name,
        status: s.dependsOn.length === 0 ? 'RUNNING' : 'PENDING',
        retryCount: 0
      })) || [],
      inputData,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString()
    };
    return of(instance).pipe(delay(200));
  }

  getWorkflowInstance(id: string): Observable<WorkflowInstance> {
    const workflow = this.workflows[0];
    const instance: WorkflowInstance = {
      id,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'RUNNING',
      steps: [
        { id: 'inst-step-1', stepId: 'step-1', stepName: '创建订单', status: 'SUCCESS', retryCount: 0, startedAt: new Date(Date.now() - 600000).toISOString(), completedAt: new Date(Date.now() - 540000).toISOString(), logs: ['步骤开始执行', '订单创建成功'] },
        { id: 'inst-step-2', stepId: 'step-2', stepName: '扣减库存', status: 'SUCCESS', retryCount: 1, startedAt: new Date(Date.now() - 540000).toISOString(), completedAt: new Date(Date.now() - 480000).toISOString(), logs: ['步骤开始执行', '第一次重试：网络超时', '库存扣减成功'] },
        { id: 'inst-step-3', stepId: 'step-3', stepName: '支付处理', status: 'RUNNING', retryCount: 0, startedAt: new Date(Date.now() - 480000).toISOString(), logs: ['步骤开始执行', '正在调用支付接口...'] },
        { id: 'inst-step-4', stepId: 'step-4', stepName: '发货通知', status: 'PENDING', retryCount: 0 }
      ],
      inputData: { orderId: 'ORD12345', amount: 999 },
      createdAt: new Date(Date.now() - 600000).toISOString(),
      startedAt: new Date(Date.now() - 600000).toISOString()
    };
    return of(instance).pipe(delay(200));
  }

  getTasks(params?: { status?: string; queue?: string; page?: number; size?: number }): Observable<{ items: Task[]; total: number }> {
    let items = [...this.tasks];
    if (params?.status) items = items.filter(t => t.status === params.status);
    if (params?.queue) items = items.filter(t => t.queue === params.queue);
    const total = items.length;
    if (params?.page !== undefined && params?.size !== undefined) {
      const start = params.page * params.size;
      items = items.slice(start, start + params.size);
    }
    return of({ items, total }).pipe(delay(200));
  }

  getTask(id: string): Observable<Task | undefined> {
    return of(this.tasks.find(t => t.id === id)).pipe(delay(100));
  }

  retryTask(taskId: string): Observable<void> {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'PENDING';
      task.retryCount++;
    }
    return of(void 0).pipe(delay(200));
  }

  cancelTask(taskId: string): Observable<void> {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) task.status = 'CANCELLED';
    return of(void 0).pipe(delay(200));
  }

  getQueues(): Observable<Queue[]> {
    return of([...this.queues]).pipe(delay(200));
  }

  pauseQueue(name: string): Observable<void> {
    const queue = this.queues.find(q => q.name === name);
    if (queue) queue.isPaused = true;
    return of(void 0).pipe(delay(200));
  }

  resumeQueue(name: string): Observable<void> {
    const queue = this.queues.find(q => q.name === name);
    if (queue) queue.isPaused = false;
    return of(void 0).pipe(delay(200));
  }

  getDeadLetterTasks(queueName: string, params?: { page?: number; size?: number }): Observable<{ items: Task[]; total: number }> {
    const items = this.tasks.filter(t => t.status === 'DEAD_LETTER' && t.queue === queueName);
    const total = items.length;
    return of({ items, total }).pipe(delay(200));
  }

  getWorkers(): Observable<Worker[]> {
    return of([...this.workers]).pipe(delay(200));
  }

  getWorker(id: string): Observable<Worker | undefined> {
    return of(this.workers.find(w => w.id === id)).pipe(delay(100));
  }

  getWorkerTaskHistory(workerId: string, params?: { limit?: number }): Observable<Task[]> {
    let items = this.tasks.filter(t => t.workerId === workerId);
    if (params?.limit) items = items.slice(0, params.limit);
    return of(items).pipe(delay(200));
  }

  getCronJobs(): Observable<CronJob[]> {
    return of([...this.cronJobs]).pipe(delay(200));
  }

  getCronJob(id: string): Observable<CronJob | undefined> {
    return of(this.cronJobs.find(c => c.id === id)).pipe(delay(100));
  }

  createCronJob(cronJob: Partial<CronJob>): Observable<CronJob> {
    const newCronJob: CronJob = {
      id: `cron-${Date.now()}`,
      name: cronJob.name || '',
      description: cronJob.description || '',
      cronExpression: cronJob.cronExpression || '',
      workflowId: cronJob.workflowId || '',
      workflowName: cronJob.workflowName || '',
      isActive: cronJob.isActive !== undefined ? cronJob.isActive : true,
      inputData: cronJob.inputData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.cronJobs.unshift(newCronJob);
    return of(newCronJob).pipe(delay(200));
  }

  updateCronJob(id: string, cronJob: Partial<CronJob>): Observable<CronJob | undefined> {
    const index = this.cronJobs.findIndex(c => c.id === id);
    if (index !== -1) {
      this.cronJobs[index] = { ...this.cronJobs[index], ...cronJob, updatedAt: new Date().toISOString() };
      return of(this.cronJobs[index]).pipe(delay(200));
    }
    return of(undefined).pipe(delay(200));
  }

  deleteCronJob(id: string): Observable<void> {
    const index = this.cronJobs.findIndex(c => c.id === id);
    if (index !== -1) this.cronJobs.splice(index, 1);
    return of(void 0).pipe(delay(200));
  }

  toggleCronJob(id: string, isActive: boolean): Observable<void> {
    const cronJob = this.cronJobs.find(c => c.id === id);
    if (cronJob) cronJob.isActive = isActive;
    return of(void 0).pipe(delay(200));
  }

  getCronJobHistory(cronJobId: string, params?: { page?: number; size?: number }): Observable<{ items: CronJobHistory[]; total: number }> {
    const items: CronJobHistory[] = Array.from({ length: 10 }, (_, i) => ({
      id: `history-${i}`,
      cronJobId,
      workflowInstanceId: `inst-${i}`,
      status: i % 3 === 0 ? 'FAILED' : 'SUCCESS',
      triggeredAt: new Date(Date.now() - i * 3600000).toISOString(),
      completedAt: i % 3 !== 0 ? new Date(Date.now() - i * 3600000 + 300000).toISOString() : undefined,
      error: i % 3 === 0 ? 'Workflow execution timeout' : undefined
    }));
    return of({ items, total: items.length }).pipe(delay(200));
  }
}
