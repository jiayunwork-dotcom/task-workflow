import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models';
import { MockDataService } from '../../services/mock-data.service';
import { DateFormatPipe, RelativeTimePipe } from '../../pipes/date-format.pipe';
import { TaskStatusPipe, StatusColorPipe } from '../../pipes/status.pipe';
import { RealtimeService, TaskStatusChangedEvent } from '../../services/realtime.service';

interface TabItem {
  label: string;
  status: string;
  count: number;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatMenuModule,
    MatDialogModule,
    FormsModule,
    DateFormatPipe,
    RelativeTimePipe,
    TaskStatusPipe,
    StatusColorPipe
  ],
  template: `
    <div class="tasks-page">
      <h2 class="page-title">任务列表</h2>

      <mat-card class="tasks-card">
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>队列</mat-label>
            <mat-select [(ngModel)]="selectedQueue" (ngModelChange)="onFilterChange()">
              <mat-option value="">全部队列</mat-option>
              <mat-option value="order">订单队列</mat-option>
              <mat-option value="inventory">库存队列</mat-option>
              <mat-option value="payment">支付队列</mat-option>
              <mat-option value="notification">通知队列</mat-option>
              <mat-option value="etl">ETL队列</mat-option>
              <mat-option value="user">用户队列</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>开始时间</mat-label>
            <input matInput [matDatepicker]="startPicker" [(ngModel)]="startTime" (ngModelChange)="onFilterChange()">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>结束时间</mat-label>
            <input matInput [matDatepicker]="endPicker" [(ngModel)]="endTime" (ngModelChange)="onFilterChange()">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>

          <span class="spacer"></span>

          <button mat-button [matMenuTriggerFor]="batchMenu" [disabled]="selectedIds.length === 0">
            <mat-icon>more_vert</mat-icon>
            批量操作 ({{ selectedIds.length }})
          </button>
          <mat-menu #batchMenu="matMenu">
            <button mat-menu-item (click)="batchRetry()">
              <mat-icon>refresh</mat-icon>
              批量重试
            </button>
            <button mat-menu-item (click)="batchCancel()">
              <mat-icon>cancel</mat-icon>
              批量取消
            </button>
            <button mat-menu-item (click)="batchMoveToDeadLetter()">
              <mat-icon>report</mat-icon>
              移至死信
            </button>
          </mat-menu>
        </div>

        <mat-tab-group (selectedTabChange)="onTabChange($event)">
          <mat-tab *ngFor="let tab of tabs" [label]="tab.label + ' (' + tab.count + ')'">
          </mat-tab>
        </mat-tab-group>

        <table mat-table [dataSource]="tasks" class="tasks-table">
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox
                [checked]="isAllSelected()"
                (change)="toggleSelectAll($event.checked)">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let task">
              <mat-checkbox
                [checked]="selectedIds.includes(task.id)"
                (change)="toggleSelect(task.id, $event.checked)">
              </mat-checkbox>
            </td>
          </ng-container>
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
              <span class="status-badge" [style.background]="task.status | statusColor">
                {{ task.status | taskStatus }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>优先级</th>
            <td mat-cell *matCellDef="let task">{{ task.priority }}</td>
          </ng-container>
          <ng-container matColumnDef="worker">
            <th mat-header-cell *matHeaderCellDef>Worker</th>
            <td mat-cell *matCellDef="let task">{{ task.workerId || '-' }}</td>
          </ng-container>
          <ng-container matColumnDef="retry">
            <th mat-header-cell *matHeaderCellDef>重试</th>
            <td mat-cell *matCellDef="let task">{{ task.retryCount }}/{{ task.maxRetryCount }}</td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>创建时间</th>
            <td mat-cell *matCellDef="let task">{{ task.createdAt | relativeTime }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>操作</th>
            <td mat-cell *matCellDef="let task">
              <button mat-icon-button (click)="viewTask(task)" matTooltip="详情">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button (click)="retryTask(task)" *ngIf="task.status === 'FAILED'" matTooltip="重试">
                <mat-icon>refresh</mat-icon>
              </button>
              <button mat-icon-button (click)="cancelTask(task)" *ngIf="['PENDING', 'RUNNING'].includes(task.status)" matTooltip="取消">
                <mat-icon>cancel</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (page)="onPageChange($event)">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .tasks-page {
      padding: 0;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }
    .tasks-card {
      border-radius: 8px;
    }
    .filter-bar {
      display: flex;
      gap: 16px;
      padding: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-field {
      width: 180px;
    }
    .spacer {
      flex: 1;
    }
    .tasks-table {
      width: 100%;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
    }
  `]
})
export class TasksComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tabs: TabItem[] = [
    { label: '全部', status: '', count: 0 },
    { label: '等待中', status: 'PENDING', count: 0 },
    { label: '执行中', status: 'RUNNING', count: 0 },
    { label: '成功', status: 'SUCCESS', count: 0 },
    { label: '失败', status: 'FAILED', count: 0 },
    { label: '死信', status: 'DEAD_LETTER', count: 0 }
  ];
  
  tasks: Task[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  selectedStatus = '';
  selectedQueue = '';
  startTime?: Date;
  endTime?: Date;
  selectedIds: string[] = [];
  displayedColumns = ['select', 'id', 'queue', 'status', 'priority', 'worker', 'retry', 'createdAt', 'actions'];

  constructor(
    private mockData: MockDataService,
    private realtimeService: RealtimeService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.realtimeService.taskUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadTasks());

    this.realtimeService.taskStatusChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: TaskStatusChangedEvent) => {
        this.updateTaskStatus(event);
      });
  }

  private updateTaskStatus(event: TaskStatusChangedEvent): void {
    const task = this.tasks.find(t => t.id === event.taskId);
    if (task) {
      task.status = event.newStatus.toUpperCase();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTasks(): void {
    this.mockData.getTasks({
      status: this.selectedStatus,
      queue: this.selectedQueue,
      page: this.pageIndex,
      size: this.pageSize
    }).subscribe(result => {
      this.tasks = result.items;
      this.total = result.total;
    });
  }

  onTabChange(event: any): void {
    this.selectedStatus = this.tabs[event.index].status;
    this.pageIndex = 0;
    this.loadTasks();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadTasks();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTasks();
  }

  isAllSelected(): boolean {
    return this.tasks.length > 0 && this.tasks.every(t => this.selectedIds.includes(t.id));
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.selectedIds = this.tasks.map(t => t.id);
    } else {
      this.selectedIds = [];
    }
  }

  toggleSelect(id: string, checked: boolean): void {
    if (checked) {
      this.selectedIds.push(id);
    } else {
      this.selectedIds = this.selectedIds.filter(i => i !== id);
    }
  }

  viewTask(task: Task): void {
    // 打开任务详情对话框
  }

  retryTask(task: Task): void {
    this.mockData.retryTask(task.id).subscribe(() => this.loadTasks());
  }

  cancelTask(task: Task): void {
    this.mockData.cancelTask(task.id).subscribe(() => this.loadTasks());
  }

  batchRetry(): void {
    this.mockData.batchRetry(this.selectedIds).subscribe(() => {
      this.selectedIds = [];
      this.loadTasks();
    });
  }

  batchCancel(): void {
    this.mockData.batchCancel(this.selectedIds).subscribe(() => {
      this.selectedIds = [];
      this.loadTasks();
    });
  }

  batchMoveToDeadLetter(): void {
    this.mockData.batchMoveToDeadLetter(this.selectedIds).subscribe(() => {
      this.selectedIds = [];
      this.loadTasks();
    });
  }
}
