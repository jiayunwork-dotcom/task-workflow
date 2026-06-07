import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Worker, Task } from '../../models';
import { MockDataService } from '../../services/mock-data.service';
import { DateFormatPipe, RelativeTimePipe, BytesPipe } from '../../pipes/date-format.pipe';
import { TaskStatusPipe, StatusColorPipe } from '../../pipes/status.pipe';

@Component({
  selector: 'app-workers',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatDialogModule,
    DateFormatPipe,
    RelativeTimePipe,
    BytesPipe,
    TaskStatusPipe,
    StatusColorPipe
  ],
  template: `
    <div class="workers-page">
      <h2 class="page-title">Worker监控</h2>

      <div class="stats-summary">
        <mat-card class="stat-item">
          <div class="stat-icon online">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div>
            <div class="stat-value">{{ onlineCount }}</div>
            <div class="stat-label">在线</div>
          </div>
        </mat-card>
        <mat-card class="stat-item">
          <div class="stat-icon busy">
            <mat-icon>pending</mat-icon>
          </div>
          <div>
            <div class="stat-value">{{ busyCount }}</div>
            <div class="stat-label">忙碌</div>
          </div>
        </mat-card>
        <mat-card class="stat-item">
          <div class="stat-icon offline">
            <mat-icon>error</mat-icon>
          </div>
          <div>
            <div class="stat-value">{{ offlineCount }}</div>
            <div class="stat-label">离线</div>
          </div>
        </mat-card>
      </div>

      <mat-card class="workers-card">
        <mat-accordion>
          <mat-expansion-panel *ngFor="let worker of workers">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <span class="status-dot" [style.background]="worker.status | statusColor"></span>
                {{ worker.name }}
              </mat-panel-title>
              <mat-panel-description>
                <span class="worker-ip">{{ worker.ipAddress }}</span>
                <span class="worker-queues">{{ worker.queues.join(', ') }}</span>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="worker-detail">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <span class="status-badge" [style.background]="worker.status | statusColor">
                    {{ worker.status }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">心跳时间</span>
                  <span>{{ worker.lastHeartbeat | relativeTime }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">已处理任务</span>
                  <span class="success-text">{{ worker.processedTasks }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">失败任务</span>
                  <span class="error-text">{{ worker.failedTasks }}</span>
                </div>
              </div>

              <div class="metrics">
                <div class="metric-item">
                  <div class="metric-header">
                    <span>CPU使用率</span>
                    <span class="metric-value">{{ worker.cpuUsage }}%</span>
                  </div>
                  <mat-progress-bar
                    [value]="worker.cpuUsage"
                    [color]="worker.cpuUsage > 80 ? 'warn' : 'primary'">
                  </mat-progress-bar>
                </div>
                <div class="metric-item">
                  <div class="metric-header">
                    <span>内存使用率</span>
                    <span class="metric-value">{{ worker.memoryUsage }}%</span>
                  </div>
                  <mat-progress-bar
                    [value]="worker.memoryUsage"
                    [color]="worker.memoryUsage > 80 ? 'warn' : 'primary'">
                  </mat-progress-bar>
                </div>
              </div>

              <div class="recent-tasks">
                <h4>最近处理的任务</h4>
                <table mat-table [dataSource]="workerTaskHistory[worker.id] || []" class="tasks-table">
                  <ng-container matColumnDef="id">
                    <th mat-header-cell *matHeaderCellDef>任务ID</th>
                    <td mat-cell *matCellDef="let task">{{ task.id }}</td>
                  </ng-container>
                  <ng-container matColumnDef="queue">
                    <th mat-header-cell *matHeaderCellDef>队列</th>
                    <td mat-cell *matCellDef="let task">{{ task.queue }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>状态</th>
                    <td mat-cell *matCellDef="let task">
                      <span class="status-badge small" [style.background]="task.status | statusColor">
                        {{ task.status | taskStatus }}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="completedAt">
                    <th mat-header-cell *matHeaderCellDef>完成时间</th>
                    <td mat-cell *matCellDef="let task">{{ task.completedAt | relativeTime }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="taskColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: taskColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>
    </div>
  `,
  styles: [`
    .workers-page {
      padding: 0;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stat-icon.online {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
    .stat-icon.busy {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
    .stat-icon.offline {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
    }
    .workers-card {
      border-radius: 8px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 12px;
    }
    .worker-ip {
      color: #64748b;
      margin-right: 16px;
    }
    .worker-queues {
      color: #3b82f6;
    }
    .worker-detail {
      padding: 16px 0;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .detail-label {
      font-size: 12px;
      color: #64748b;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
    }
    .status-badge.small {
      padding: 2px 6px;
      font-size: 11px;
    }
    .success-text {
      color: #10b981;
      font-weight: 500;
    }
    .error-text {
      color: #ef4444;
      font-weight: 500;
    }
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #1e293b;
    }
    .metric-value {
      font-weight: 500;
    }
    .recent-tasks h4 {
      margin: 0 0 12px 0;
      color: #1e293b;
    }
    .tasks-table {
      width: 100%;
    }
  `]
})
export class WorkersComponent implements OnInit {
  workers: Worker[] = [];
  workerTaskHistory: Record<string, Task[]> = {};
  taskColumns = ['id', 'queue', 'status', 'completedAt'];

  get onlineCount(): number {
    return this.workers.filter(w => w.status === 'ONLINE').length;
  }

  get busyCount(): number {
    return this.workers.filter(w => w.status === 'BUSY').length;
  }

  get offlineCount(): number {
    return this.workers.filter(w => w.status === 'OFFLINE').length;
  }

  constructor(
    private mockData: MockDataService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers(): void {
    this.mockData.getWorkers().subscribe(workers => {
      this.workers = workers;
      workers.forEach(worker => {
        this.loadWorkerHistory(worker.id);
      });
    });
  }

  loadWorkerHistory(workerId: string): void {
    this.mockData.getWorkerTaskHistory(workerId, { limit: 5 }).subscribe(tasks => {
      this.workerTaskHistory[workerId] = tasks;
    });
  }
}
