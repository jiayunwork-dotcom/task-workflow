import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { Queue, Task } from '../../models';
import { MockDataService } from '../../services/mock-data.service';
import { DateFormatPipe } from '../../pipes/date-format.pipe';
import { TaskStatusPipe, StatusColorPipe } from '../../pipes/status.pipe';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';

@Component({
  selector: 'app-queues',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatTabsModule,
    MatListModule,
    DateFormatPipe,
    TaskStatusPipe,
    StatusColorPipe
  ],
  template: `
    <div class="queues-page">
      <h2 class="page-title">队列管理</h2>

      <mat-card class="queues-card">
        <table mat-table [dataSource]="queues" class="queues-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>队列名称</th>
            <td mat-cell *matCellDef="let queue">
              <div class="queue-name">{{ queue.displayName }}</div>
              <div class="queue-technical">{{ queue.name }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="depth">
            <th mat-header-cell *matHeaderCellDef>总深度</th>
            <td mat-cell *matCellDef="let queue">
              <span class="depth-number">{{ queue.depth }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="pending">
            <th mat-header-cell *matHeaderCellDef>等待中</th>
            <td mat-cell *matCellDef="let queue">{{ queue.pendingCount }}</td>
          </ng-container>
          <ng-container matColumnDef="running">
            <th mat-header-cell *matHeaderCellDef>执行中</th>
            <td mat-cell *matCellDef="let queue">{{ queue.runningCount }}</td>
          </ng-container>
          <ng-container matColumnDef="deadLetter">
            <th mat-header-cell *matHeaderCellDef>死信</th>
            <td mat-cell *matCellDef="let queue">
              <button mat-button color="warn" *ngIf="queue.deadLetterCount > 0" (click)="viewDeadLetter(queue)">
                {{ queue.deadLetterCount }}
              </button>
              <span *ngIf="queue.deadLetterCount === 0">0</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>状态</th>
            <td mat-cell *matCellDef="let queue">
              <span class="status-badge" [style.background]="queue.isPaused ? '#f59e0b' : '#10b981'">
                {{ queue.isPaused ? '已暂停' : '运行中' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="config">
            <th mat-header-cell *matHeaderCellDef>配置</th>
            <td mat-cell *matCellDef="let queue">
              <div class="config-text">最大重试: {{ queue.maxRetries }}次</div>
              <div class="config-text">超时: {{ queue.visibilityTimeout }}s</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>操作</th>
            <td mat-cell *matCellDef="let queue">
              <button mat-icon-button (click)="togglePause(queue)" [matTooltip]="queue.isPaused ? '恢复' : '暂停'">
                <mat-icon>{{ queue.isPaused ? 'play_arrow' : 'pause' }}</mat-icon>
              </button>
              <button mat-icon-button (click)="viewDeadLetter(queue)" matTooltip="查看死信">
                <mat-icon>report</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .queues-page {
      padding: 0;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }
    .queues-card {
      border-radius: 8px;
    }
    .queues-table {
      width: 100%;
    }
    .queue-name {
      font-weight: 500;
      color: #1e293b;
    }
    .queue-technical {
      font-size: 12px;
      color: #64748b;
    }
    .depth-number {
      font-size: 18px;
      font-weight: 600;
      color: #3b82f6;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
    }
    .config-text {
      font-size: 12px;
      color: #64748b;
    }
  `]
})
export class QueuesComponent implements OnInit {
  queues: Queue[] = [];
  displayedColumns = ['name', 'depth', 'pending', 'running', 'deadLetter', 'status', 'config', 'actions'];

  constructor(
    private mockData: MockDataService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadQueues();
  }

  loadQueues(): void {
    this.mockData.getQueues().subscribe(queues => {
      this.queues = queues;
    });
  }

  togglePause(queue: Queue): void {
    if (queue.isPaused) {
      this.mockData.resumeQueue(queue.name).subscribe(() => this.loadQueues());
    } else {
      this.mockData.pauseQueue(queue.name).subscribe(() => this.loadQueues());
    }
  }

  viewDeadLetter(queue: Queue): void {
    this.dialog.open(DeadLetterDialogComponent, {
      width: '800px',
      data: queue
    });
  }
}

@Component({
  selector: 'app-dead-letter-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTableModule, MatIconModule, DateFormatPipe, TaskStatusPipe, StatusColorPipe],
  template: `
    <h2 mat-dialog-title>{{ data.displayName }} - 死信队列</h2>
    <mat-dialog-content>
      <table mat-table [dataSource]="tasks" class="dead-letter-table">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>任务ID</th>
          <td mat-cell *matCellDef="let task">{{ task.id }}</td>
        </ng-container>
        <ng-container matColumnDef="error">
          <th mat-header-cell *matHeaderCellDef>错误信息</th>
          <td mat-cell *matCellDef="let task">{{ task.error || '-' }}</td>
        </ng-container>
        <ng-container matColumnDef="retryCount">
          <th mat-header-cell *matHeaderCellDef>重试次数</th>
          <td mat-cell *matCellDef="let task">{{ task.retryCount }}</td>
        </ng-container>
        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>创建时间</th>
          <td mat-cell *matCellDef="let task">{{ task.createdAt | dateFormat }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>操作</th>
          <td mat-cell *matCellDef="let task">
            <button mat-icon-button (click)="requeue(task)" matTooltip="重新入队">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button (click)="discard(task)" matTooltip="丢弃">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>关闭</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dead-letter-table {
      width: 100%;
    }
  `]
})
export class DeadLetterDialogComponent implements OnInit {
  data: Queue;
  tasks: Task[] = [];
  displayedColumns = ['id', 'error', 'retryCount', 'createdAt', 'actions'];

  constructor(@Inject(MAT_DIALOG_DATA) data: Queue, private mockData: MockDataService) {
    this.data = data;
  }

  ngOnInit(): void {
    this.loadDeadLetterTasks();
  }

  loadDeadLetterTasks(): void {
    this.mockData.getDeadLetterTasks(this.data.name).subscribe(result => {
      this.tasks = result.items;
    });
  }

  requeue(task: Task): void {
    this.mockData.requeueDeadLetter(this.data.name, task.id).subscribe(() => {
      this.loadDeadLetterTasks();
    });
  }

  discard(task: Task): void {
    this.mockData.discardDeadLetter(this.data.name, task.id).subscribe(() => {
      this.loadDeadLetterTasks();
    });
  }
}
