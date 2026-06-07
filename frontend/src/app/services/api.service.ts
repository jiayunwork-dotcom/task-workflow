import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
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
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats`);
  }

  getQueueDepths(): Observable<QueueDepthItem[]> {
    return this.http.get<QueueDepthItem[]>(`${this.baseUrl}/dashboard/queue-depths`);
  }

  getTaskTrend(): Observable<TaskTrendItem[]> {
    return this.http.get<TaskTrendItem[]>(`${this.baseUrl}/dashboard/task-trend`);
  }

  getAlerts(params?: { limit?: number; unreadOnly?: boolean }): Observable<Alert[]> {
    let httpParams = new HttpParams();
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.unreadOnly) httpParams = httpParams.set('unreadOnly', params.unreadOnly);
    return this.http.get<Alert[]>(`${this.baseUrl}/alerts`, { params: httpParams });
  }

  markAlertRead(alertId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/alerts/${alertId}/read`, {});
  }

  getWorkflows(params?: { page?: number; size?: number }): Observable<{ items: WorkflowDefinition[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.size) httpParams = httpParams.set('size', params.size);
    return this.http.get<{ items: WorkflowDefinition[]; total: number }>(`${this.baseUrl}/workflows`, { params: httpParams });
  }

  getWorkflow(id: string): Observable<WorkflowDefinition> {
    return this.http.get<WorkflowDefinition>(`${this.baseUrl}/workflows/${id}`);
  }

  createWorkflow(workflow: Partial<WorkflowDefinition>): Observable<WorkflowDefinition> {
    return this.http.post<WorkflowDefinition>(`${this.baseUrl}/workflows`, workflow);
  }

  updateWorkflow(id: string, workflow: Partial<WorkflowDefinition>): Observable<WorkflowDefinition> {
    return this.http.put<WorkflowDefinition>(`${this.baseUrl}/workflows/${id}`, workflow);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/workflows/${id}`);
  }

  triggerWorkflow(id: string, inputData?: Record<string, any>): Observable<WorkflowInstance> {
    return this.http.post<WorkflowInstance>(`${this.baseUrl}/workflows/${id}/trigger`, { inputData });
  }

  getWorkflowInstances(params?: { workflowId?: string; status?: string; page?: number; size?: number }): Observable<{ items: WorkflowInstance[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.workflowId) httpParams = httpParams.set('workflowId', params.workflowId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.size) httpParams = httpParams.set('size', params.size);
    return this.http.get<{ items: WorkflowInstance[]; total: number }>(`${this.baseUrl}/workflow-instances`, { params: httpParams });
  }

  getWorkflowInstance(id: string): Observable<WorkflowInstance> {
    return this.http.get<WorkflowInstance>(`${this.baseUrl}/workflow-instances/${id}`);
  }

  retryStep(workflowInstanceId: string, stepId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/workflow-instances/${workflowInstanceId}/steps/${stepId}/retry`, {});
  }

  getTasks(params?: {
    status?: string;
    queue?: string;
    startTime?: string;
    endTime?: string;
    page?: number;
    size?: number;
  }): Observable<{ items: Task[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.queue) httpParams = httpParams.set('queue', params.queue);
    if (params?.startTime) httpParams = httpParams.set('startTime', params.startTime);
    if (params?.endTime) httpParams = httpParams.set('endTime', params.endTime);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.size) httpParams = httpParams.set('size', params.size);
    return this.http.get<{ items: Task[]; total: number }>(`${this.baseUrl}/tasks`, { params: httpParams });
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${id}`);
  }

  retryTask(taskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/${taskId}/retry`, {});
  }

  cancelTask(taskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/${taskId}/cancel`, {});
  }

  moveToDeadLetter(taskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/${taskId}/dead-letter`, {});
  }

  batchRetry(taskIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/batch-retry`, { taskIds });
  }

  batchCancel(taskIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/batch-cancel`, { taskIds });
  }

  batchMoveToDeadLetter(taskIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/batch-dead-letter`, { taskIds });
  }

  getQueues(): Observable<Queue[]> {
    return this.http.get<Queue[]>(`${this.baseUrl}/queues`);
  }

  getQueue(name: string): Observable<Queue> {
    return this.http.get<Queue>(`${this.baseUrl}/queues/${name}`);
  }

  pauseQueue(name: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/queues/${name}/pause`, {});
  }

  resumeQueue(name: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/queues/${name}/resume`, {});
  }

  getDeadLetterTasks(queueName: string, params?: { page?: number; size?: number }): Observable<{ items: Task[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.size) httpParams = httpParams.set('size', params.size);
    return this.http.get<{ items: Task[]; total: number }>(`${this.baseUrl}/queues/${queueName}/dead-letter`, { params: httpParams });
  }

  requeueDeadLetter(queueName: string, taskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/queues/${queueName}/dead-letter/${taskId}/requeue`, {});
  }

  discardDeadLetter(queueName: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/queues/${queueName}/dead-letter/${taskId}`);
  }

  getWorkers(): Observable<Worker[]> {
    return this.http.get<Worker[]>(`${this.baseUrl}/workers`);
  }

  getWorker(id: string): Observable<Worker> {
    return this.http.get<Worker>(`${this.baseUrl}/workers/${id}`);
  }

  getWorkerTaskHistory(workerId: string, params?: { limit?: number }): Observable<Task[]> {
    let httpParams = new HttpParams();
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    return this.http.get<Task[]>(`${this.baseUrl}/workers/${workerId}/task-history`, { params: httpParams });
  }

  getCronJobs(): Observable<CronJob[]> {
    return this.http.get<CronJob[]>(`${this.baseUrl}/cron-jobs`);
  }

  getCronJob(id: string): Observable<CronJob> {
    return this.http.get<CronJob>(`${this.baseUrl}/cron-jobs/${id}`);
  }

  createCronJob(cronJob: Partial<CronJob>): Observable<CronJob> {
    return this.http.post<CronJob>(`${this.baseUrl}/cron-jobs`, cronJob);
  }

  updateCronJob(id: string, cronJob: Partial<CronJob>): Observable<CronJob> {
    return this.http.put<CronJob>(`${this.baseUrl}/cron-jobs/${id}`, cronJob);
  }

  deleteCronJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cron-jobs/${id}`);
  }

  toggleCronJob(id: string, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/cron-jobs/${id}/toggle`, { isActive });
  }

  getCronJobHistory(cronJobId: string, params?: { page?: number; size?: number }): Observable<{ items: CronJobHistory[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.size) httpParams = httpParams.set('size', params.size);
    return this.http.get<{ items: CronJobHistory[]; total: number }>(`${this.baseUrl}/cron-jobs/${cronJobId}/history`, { params: httpParams });
  }
}
