import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CronJob, CronJobHistory } from '../../models';
import { MockDataService } from '../../services/mock-data.service';
import { DateFormatPipe, RelativeTimePipe } from '../../pipes/date-format.pipe';
import { TaskStatusPipe, StatusColorPipe } from '../../pipes/status.pipe';

@Component({
  selector: 'app-cron-jobs',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatSlideToggleModule,
    DateFormatPipe,
    RelativeTimePipe,
    TaskStatusPipe,
    StatusColorPipe
  ],
  template: `
    <div class="cron-jobs-page">
      <div class="page-header">
        <h2 class="page-title">定时任务</h2>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          新建定时任务
        </button>
      </div>

      <mat-card class="cron-jobs-card">
        <mat-accordion>
          <mat-expansion-panel *ngFor="let job of cronJobs">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <span class="status-indicator" [class.active]="job.isActive"></span>
                {{ job.name }}
              </mat-panel-title>
              <mat-panel-description>
                <span class="cron-expr">{{ job.cronExpression }}</span>
                <span class="workflow-name">{{ job.workflowName }}</span>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="job-detail">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">描述</span>
                  <span>{{ job.description || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Cron表达式</span>
                  <span class="cron-code">{{ job.cronExpression }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">关联工作流</span>
                  <span>{{ job.workflowName }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <mat-slide-toggle
                    [checked]="job.isActive"
                    (change)="toggleJob(job, $event.checked)">
                    {{ job.isActive ? '运行中' : '已停用' }}
                  </mat-slide-toggle>
                </div>
                <div class="detail-item">
                  <span class="detail-label">上次执行</span>
                  <span>{{ job.lastRunAt | relativeTime }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">下次执行</span>
                  <span>{{ job.nextRunAt | dateFormat }}</span>
                </div>
              </div>

              <div class="job-actions">
                <button mat-button (click)="openEditDialog(job)">
                  <mat-icon>edit</mat-icon>
                  编辑
                </button>
                <button mat-button color="warn" (click)="deleteJob(job)">
                  <mat-icon>delete</mat-icon>
                  删除
                </button>
              </div>

              <div class="execution-history" *ngIf="jobHistory[job.id]">
                <h4>执行历史</h4>
                <table mat-table [dataSource]="jobHistory[job.id] || []" class="history-table">
                  <ng-container matColumnDef="triggeredAt">
                    <th mat-header-cell *matHeaderCellDef>触发时间</th>
                    <td mat-cell *matCellDef="let h">{{ h.triggeredAt | dateFormat }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>状态</th>
                    <td mat-cell *matCellDef="let h">
                      <span class="status-badge small" [style.background]="h.status === 'SUCCESS' ? '#10b981' : '#ef4444'">
                        {{ h.status === 'SUCCESS' ? '成功' : '失败' }}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="instanceId">
                    <th mat-header-cell *matHeaderCellDef>实例ID</th>
                    <td mat-cell *matCellDef="let h">{{ h.workflowInstanceId }}</td>
                  </ng-container>
                  <ng-container matColumnDef="error">
                    <th mat-header-cell *matHeaderCellDef>错误信息</th>
                    <td mat-cell *matCellDef="let h">{{ h.error || '-' }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="historyColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: historyColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>
    </div>
  `,
  styles: [`
    .cron-jobs-page {
      padding: 0;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }
    .cron-jobs-card {
      border-radius: 8px;
    }
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #94a3b8;
      margin-right: 12px;
    }
    .status-indicator.active {
      background: #10b981;
    }
    .cron-expr {
      font-family: monospace;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 16px;
    }
    .workflow-name {
      color: #3b82f6;
    }
    .job-detail {
      padding: 16px 0;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
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
    .cron-code {
      font-family: monospace;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .job-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .execution-history h4 {
      margin: 0 0 12px 0;
      color: #1e293b;
    }
    .history-table {
      width: 100%;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
    }
    .status-badge.small {
      padding: 2px 6px;
      font-size: 11px;
    }
  `]
})
export class CronJobsComponent implements OnInit {
  cronJobs: CronJob[] = [];
  jobHistory: Record<string, CronJobHistory[]> = {};
  historyColumns = ['triggeredAt', 'status', 'instanceId', 'error'];

  constructor(
    private mockData: MockDataService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCronJobs();
  }

  loadCronJobs(): void {
    this.mockData.getCronJobs().subscribe(jobs => {
      this.cronJobs = jobs;
      jobs.forEach(job => {
        this.loadJobHistory(job.id);
      });
    });
  }

  loadJobHistory(jobId: string): void {
    this.mockData.getCronJobHistory(jobId, { page: 0, size: 5 }).subscribe(result => {
      this.jobHistory[jobId] = result.items;
    });
  }

  toggleJob(job: CronJob, isActive: boolean): void {
    this.mockData.toggleCronJob(job.id, isActive).subscribe(() => {
      job.isActive = isActive;
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CronJobFormDialogComponent, {
      width: '600px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.mockData.createCronJob(result).subscribe(() => this.loadCronJobs());
      }
    });
  }

  openEditDialog(job: CronJob): void {
    const dialogRef = this.dialog.open(CronJobFormDialogComponent, {
      width: '600px',
      data: job
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.mockData.updateCronJob(job.id, result).subscribe(() => this.loadCronJobs());
      }
    });
  }

  deleteJob(job: CronJob): void {
    if (confirm(`确定要删除定时任务「${job.name}」吗？`)) {
      this.mockData.deleteCronJob(job.id).subscribe(() => this.loadCronJobs());
    }
  }
}

@Component({
  selector: 'app-cron-job-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? '编辑' : '新建' }}定时任务</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-container">
        <mat-form-field class="full-width">
          <mat-label>任务名称</mat-label>
          <input matInput formControlName="name" required>
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>描述</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Cron表达式</mat-label>
          <input matInput formControlName="cronExpression" required placeholder="0 0 2 * * ?">
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>关联工作流</mat-label>
          <mat-select formControlName="workflowId" required>
            <mat-option value="wf-001">订单处理工作流</mat-option>
            <mat-option value="wf-002">数据同步工作流</mat-option>
            <mat-option value="wf-003">用户注册审核</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>输入数据 (JSON)</mat-label>
          <textarea matInput formControlName="inputData" rows="3" placeholder='{"key": "value"}'></textarea>
        </mat-form-field>

        <mat-checkbox formControlName="isActive">启用</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="form.value" [disabled]="!form.valid">
        确认
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class CronJobFormDialogComponent {
  form: FormGroup;
  data?: CronJob;

  get isEdit(): boolean {
    return !!this.data;
  }

  constructor(@Inject(MAT_DIALOG_DATA) data: CronJob | null, private fb: FormBuilder) {
    this.data = data || undefined;
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      description: [data?.description || ''],
      cronExpression: [data?.cronExpression || '', Validators.required],
      workflowId: [data?.workflowId || '', Validators.required],
      workflowName: [data?.workflowName || ''],
      inputData: [data?.inputData ? JSON.stringify(data.inputData) : ''],
      isActive: [data?.isActive !== undefined ? data.isActive : true]
    });
  }
}
