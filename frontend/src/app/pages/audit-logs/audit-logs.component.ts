import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormsModule } from '@angular/forms';
import {
  NgChartsModule,
} from 'ng2-charts';
import { ChartOptions, ChartType, ChartData } from 'chart.js';
import { ApiService } from '../../services/api.service';
import { RealtimeService, AuditLogCreatedEvent } from '../../services/realtime.service';
import { AuditLog, AuditLogType, AuditResourceType } from '../../models';
import { DateFormatPipe } from '../../pipes/date-format.pipe';

interface FilterParams {
  actionTypes: AuditLogType[];
  startTime?: Date;
  endTime?: Date;
  operator: string;
  resourceId: string;
}

interface DiffLine {
  key: string;
  value: string;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
}

const ACTION_TYPE_COLORS: Record<AuditLogType, string> = {
  TASK_CREATED: '#10b981',
  TASK_CLAIMED: '#3b82f6',
  TASK_STARTED: '#8b5cf6',
  TASK_COMPLETED: '#059669',
  TASK_FAILED: '#ef4444',
  TASK_TIMEOUT: '#f59e0b',
  TASK_REQUEUED: '#06b6d4',
  WORKFLOW_STARTED: '#8b5cf6',
  WORKFLOW_COMPLETED: '#059669',
  WORKFLOW_CANCELLED: '#ef4444',
  WORKER_ONLINE: '#10b981',
  WORKER_OFFLINE: '#6b7280',
  QUEUE_PAUSED: '#f59e0b',
  QUEUE_RESUMED: '#10b981',
  CRON_TRIGGERED: '#8b5cf6',
  USER_LOGIN: '#3b82f6',
  USER_LOGOUT: '#6b7280',
  CONFIG_CHANGED: '#f59e0b',
};

const ACTION_TYPE_LABELS: Record<AuditLogType, string> = {
  TASK_CREATED: '任务创建',
  TASK_CLAIMED: '任务领取',
  TASK_STARTED: '任务开始',
  TASK_COMPLETED: '任务完成',
  TASK_FAILED: '任务失败',
  TASK_TIMEOUT: '任务超时',
  TASK_REQUEUED: '任务重入队',
  WORKFLOW_STARTED: '工作流启动',
  WORKFLOW_COMPLETED: '工作流完成',
  WORKFLOW_CANCELLED: '工作流取消',
  WORKER_ONLINE: 'Worker上线',
  WORKER_OFFLINE: 'Worker下线',
  QUEUE_PAUSED: '队列暂停',
  QUEUE_RESUMED: '队列恢复',
  CRON_TRIGGERED: '定时触发',
  USER_LOGIN: '用户登录',
  USER_LOGOUT: '用户登出',
  CONFIG_CHANGED: '配置变更',
};

const RESOURCE_TYPE_LABELS: Record<AuditResourceType, string> = {
  TASK: '任务',
  WORKFLOW: '工作流',
  WORKER: 'Worker',
  QUEUE: '队列',
  CRON: '定时任务',
  USER: '用户',
};

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
    MatGridListModule,
    FormsModule,
    NgChartsModule,
    DateFormatPipe,
  ],
  template: `
    <div class="audit-logs-page">
      <h2 class="page-title">审计日志</h2>

      <mat-card class="stats-card">
        <mat-grid-list cols="4" rowHeight="80px" gutterSize="16">
          <mat-grid-tile>
            <div class="stat-item">
              <div class="stat-value">{{ todayCount }}</div>
              <div class="stat-label">今日操作数</div>
            </div>
          </mat-grid-tile>
          <mat-grid-tile>
            <div class="stat-item">
              <div class="stat-value">{{ weekCount }}</div>
              <div class="stat-label">本周操作数</div>
            </div>
          </mat-grid-tile>
          <mat-grid-tile>
            <div class="stat-item">
              <div class="stat-value">{{ topUser?.operator || '-' }}</div>
              <div class="stat-label">最活跃用户</div>
            </div>
          </mat-grid-tile>
          <mat-grid-tile>
            <div class="stat-item">
              <div class="stat-value">{{ topActionType }}</div>
              <div class="stat-label">最频繁操作</div>
            </div>
          </mat-grid-tile>
        </mat-grid-list>
      </mat-card>

      <div class="charts-row">
        <mat-card class="chart-card">
          <h3 class="chart-title">操作类型分布</h3>
          <div class="chart-container">
            <canvas baseChart
              [data]="doughnutChartData"
              [type]="doughnutChartType"
              [options]="doughnutChartOptions">
            </canvas>
          </div>
        </mat-card>

        <mat-card class="chart-card">
          <h3 class="chart-title">最近24小时操作量</h3>
          <div class="chart-container">
            <canvas baseChart
              [data]="lineChartData"
              [type]="lineChartType"
              [options]="lineChartOptions">
            </canvas>
          </div>
        </mat-card>
      </div>

      <mat-card class="filter-card">
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="filter-field filter-field-wide">
            <mat-label>操作类型</mat-label>
            <mat-select
              [(ngModel)]="filters.actionTypes"
              (ngModelChange)="onFilterChange()"
              multiple>
              <mat-option *ngFor="let type of allActionTypes" [value]="type">
                {{ ACTION_TYPE_LABELS[type] }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>开始时间</mat-label>
            <input
              matInput
              [matDatepicker]="startPicker"
              [(ngModel)]="filters.startTime"
              (ngModelChange)="onFilterChange()">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>结束时间</mat-label>
            <input
              matInput
              [matDatepicker]="endPicker"
              [(ngModel)]="filters.endTime"
              (ngModelChange)="onFilterChange()">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>操作人</mat-label>
            <input
              matInput
              [(ngModel)]="filters.operator"
              (ngModelChange)="onFilterChange()"
              placeholder="输入操作人">
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>资源ID</mat-label>
            <input
              matInput
              [(ngModel)]="filters.resourceId"
              (ngModelChange)="onFilterChange()"
              placeholder="输入资源ID">
          </mat-form-field>

          <span class="spacer"></span>

          <button mat-raised-button color="primary" (click)="loadData()">
            <mat-icon>search</mat-icon>
            查询
          </button>
          <button mat-button (click)="resetFilters()">
            <mat-icon>refresh</mat-icon>
            重置
          </button>
        </div>
      </mat-card>

      <mat-card class="table-card">
        <table mat-table [dataSource]="auditLogs" class="audit-logs-table" multiTemplateDataRows>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>操作时间</th>
            <td mat-cell *matCellDef="let log">{{ log.createdAt | dateFormat }}</td>
          </ng-container>

          <ng-container matColumnDef="actionType">
            <th mat-header-cell *matHeaderCellDef>操作类型</th>
            <td mat-cell *matCellDef="let log">
              <span
                class="action-tag"
                [style.background]="ACTION_TYPE_COLORS[log.actionType]">
                {{ ACTION_TYPE_LABELS[log.actionType] }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="operator">
            <th mat-header-cell *matHeaderCellDef>操作人</th>
            <td mat-cell *matCellDef="let log">{{ log.operator }}</td>
          </ng-container>

          <ng-container matColumnDef="resourceType">
            <th mat-header-cell *matHeaderCellDef>资源类型</th>
            <td mat-cell *matCellDef="let log">
              {{ log.resourceType ? RESOURCE_TYPE_LABELS[log.resourceType] : '-' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="resourceId">
            <th mat-header-cell *matHeaderCellDef>资源ID</th>
            <td mat-cell *matCellDef="let log" class="resource-id-cell">
              <span matTooltip="{{ log.resourceId }}">
                {{ log.resourceId ? (log.resourceId | slice:0:8) + '...' : '-' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="durationMs">
            <th mat-header-cell *matHeaderCellDef>耗时</th>
            <td mat-cell *matCellDef="let log">
              {{ log.durationMs ? log.durationMs + 'ms' : '-' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="expandedDetail">
            <td mat-cell *matCellDef="let log" [attr.colspan]="displayedColumns.length">
              <div class="detail-panel" *ngIf="expandedRow === log">
                <div class="snapshot-container">
                  <div class="snapshot-panel">
                    <h4>操作前</h4>
                    <div class="snapshot-json">
                      <div
                        *ngFor="let line of getBeforeDiffLines(log)"
                        class="diff-line"
                        [class.diff-added]="line.type === 'added'"
                        [class.diff-removed]="line.type === 'removed'"
                        [class.diff-modified]="line.type === 'modified'">
                        <span class="diff-key">{{ line.key }}:</span>
                        <span class="diff-value">{{ line.value }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="snapshot-divider"></div>
                  <div class="snapshot-panel">
                    <h4>操作后</h4>
                    <div class="snapshot-json">
                      <div
                        *ngFor="let line of getAfterDiffLines(log)"
                        class="diff-line"
                        [class.diff-added]="line.type === 'added'"
                        [class.diff-removed]="line.type === 'removed'"
                        [class.diff-modified]="line.type === 'modified'">
                        <span class="diff-key">{{ line.key }}:</span>
                        <span class="diff-value">{{ line.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="diff-legend">
                  <span class="legend-item"><span class="legend-box diff-removed"></span>已删除</span>
                  <span class="legend-item"><span class="legend-box diff-added"></span>已新增</span>
                  <span class="legend-item"><span class="legend-box diff-modified"></span>已修改</span>
                </div>
                <div class="detail-meta" *ngIf="log.ipAddress || log.userAgent">
                  <span *ngIf="log.ipAddress">IP: {{ log.ipAddress }}</span>
                  <span *ngIf="log.userAgent">UA: {{ log.userAgent }}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns;"
            class="log-row"
            [class.expanded]="expandedRow === row"
            [class.new-log]="newLogIds.has(row.id)"
            (click)="toggleRow(row)">
          </tr>
          <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>
        </table>

        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          [pageSizeOptions]="[10, 20, 50, 100]"
          (page)="onPageChange($event)">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .audit-logs-page {
      padding: 0;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }
    .stats-card {
      margin-bottom: 24px;
      border-radius: 8px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 14px;
      color: #64748b;
    }
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .chart-card {
      border-radius: 8px;
    }
    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 16px 0;
    }
    .chart-container {
      height: 280px;
      position: relative;
    }
    .filter-card {
      margin-bottom: 24px;
      border-radius: 8px;
    }
    .filter-bar {
      display: flex;
      gap: 16px;
      padding: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .filter-field {
      width: 180px;
    }
    .filter-field-wide {
      width: 280px;
    }
    .spacer {
      flex: 1;
    }
    .table-card {
      border-radius: 8px;
    }
    .audit-logs-table {
      width: 100%;
    }
    .action-tag {
      padding: 4px 10px;
      border-radius: 12px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
    }
    .resource-id-cell {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .log-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .log-row:hover {
      background-color: #f8fafc;
    }
    .log-row.expanded {
      background-color: #f1f5f9;
    }
    .log-row.new-log {
      animation: slideIn 0.5s ease-out;
      background-color: #f0fdf4;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .detail-row {
      background-color: #f8fafc;
    }
    .detail-panel {
      padding: 16px;
    }
    .snapshot-container {
      display: grid;
      grid-template-columns: 1fr 40px 1fr;
      gap: 16px;
      margin-bottom: 12px;
    }
    .snapshot-panel {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }
    .snapshot-panel h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }
    .snapshot-json {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: #334155;
      max-height: 300px;
      overflow: auto;
      background: #f8fafc;
      padding: 8px;
      border-radius: 4px;
    }
    .diff-line {
      padding: 1px 4px;
      border-radius: 2px;
      margin: 1px 0;
    }
    .diff-key {
      color: #7c3aed;
      margin-right: 4px;
    }
    .diff-value {
      color: #0369a1;
    }
    .diff-added {
      background-color: #dcfce7;
    }
    .diff-added .diff-key,
    .diff-added .diff-value {
      color: #166534;
    }
    .diff-removed {
      background-color: #fee2e2;
      text-decoration: line-through;
    }
    .diff-removed .diff-key,
    .diff-removed .diff-value {
      color: #991b1b;
    }
    .diff-modified {
      background-color: #fef9c3;
    }
    .diff-modified .diff-key,
    .diff-modified .diff-value {
      color: #854d0e;
    }
    .snapshot-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
    }
    .snapshot-divider::before {
      content: '→';
      font-size: 20px;
    }
    .diff-legend {
      display: flex;
      gap: 16px;
      padding: 8px 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
    }
    .legend-box {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }
    .detail-meta {
      display: flex;
      gap: 24px;
      font-size: 12px;
      color: #64748b;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }
  `]
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly ACTION_TYPE_COLORS = ACTION_TYPE_COLORS;
  readonly ACTION_TYPE_LABELS = ACTION_TYPE_LABELS;
  readonly RESOURCE_TYPE_LABELS = RESOURCE_TYPE_LABELS;

  allActionTypes: AuditLogType[] = Object.keys(ACTION_TYPE_LABELS) as AuditLogType[];

  auditLogs: AuditLog[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 20;
  expandedRow: AuditLog | null = null;
  newLogIds = new Set<string>();

  filters: FilterParams = {
    actionTypes: [],
    operator: '',
    resourceId: '',
  };

  displayedColumns = ['createdAt', 'actionType', 'operator', 'resourceType', 'resourceId', 'durationMs'];

  todayCount = 0;
  weekCount = 0;
  topUser?: { operator: string; count: number };
  topActionType = '-';

  doughnutChartType: ChartType = 'doughnut';
  doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 0,
    }]
  };
  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { size: 12 }
        }
      }
    }
  };

  lineChartType: ChartType = 'line';
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: '操作量',
      data: [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11 } }
      }
    }
  };

  private diffCache = new Map<string, { before: DiffLine[]; after: DiffLine[] }>();

  constructor(
    private apiService: ApiService,
    private realtimeService: RealtimeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadStats();

    this.realtimeService.auditLogCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: AuditLogCreatedEvent) => {
        this.handleNewAuditLog(event);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
    };

    if (this.filters.actionTypes.length > 0) {
      params.actionTypes = this.filters.actionTypes;
    }
    if (this.filters.startTime) {
      params.startTime = this.filters.startTime.toISOString();
    }
    if (this.filters.endTime) {
      params.endTime = this.filters.endTime.toISOString();
    }
    if (this.filters.operator) {
      params.operator = this.filters.operator;
    }
    if (this.filters.resourceId) {
      params.resourceId = this.filters.resourceId;
    }

    this.apiService.getAuditLogs(params).subscribe(result => {
      this.auditLogs = result.data;
      this.total = result.total;
      this.diffCache.clear();
      this.cdr.detectChanges();
    });
  }

  loadStats(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endTime = new Date();

    this.apiService.getAuditLogStats(weekStart.toISOString(), endTime.toISOString()).subscribe(stats => {
      const todayDateStr = this.formatDateForCompare(todayStart);
      this.todayCount = stats.hourlyDistribution
        .filter(h => {
          const hourDateStr = h.hour.slice(0, 10);
          return hourDateStr === todayDateStr;
        })
        .reduce((sum, h) => sum + h.count, 0);

      this.weekCount = stats.hourlyDistribution.reduce((sum, h) => sum + h.count, 0);

      if (stats.topUsers.length > 0) {
        this.topUser = stats.topUsers[0];
      }

      if (stats.actionTypeCounts.length > 0) {
        const maxAction = stats.actionTypeCounts.reduce((max, curr) =>
          curr.count > max.count ? curr : max
        );
        this.topActionType = ACTION_TYPE_LABELS[maxAction.actionType];
      }

      this.updateDoughnutChart(stats.actionTypeCounts);
      this.updateLineChart(stats.hourlyDistribution);
      this.cdr.detectChanges();
    });
  }

  private formatDateForCompare(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  updateDoughnutChart(actionTypeCounts: { actionType: AuditLogType; count: number }[]): void {
    const labels = actionTypeCounts.map(c => ACTION_TYPE_LABELS[c.actionType]);
    const data = actionTypeCounts.map(c => c.count);
    const colors = actionTypeCounts.map(c => ACTION_TYPE_COLORS[c.actionType]);

    this.doughnutChartData = {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }]
    };
  }

  updateLineChart(hourlyDistribution: { hour: string; count: number }[]): void {
    const labels = hourlyDistribution.map(h => h.hour.slice(11, 16));
    const data = hourlyDistribution.map(h => h.count);

    this.lineChartData = {
      labels,
      datasets: [{
        label: '操作量',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    };
  }

  onFilterChange(): void {
    this.pageIndex = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  resetFilters(): void {
    this.filters = {
      actionTypes: [],
      operator: '',
      resourceId: '',
    };
    this.pageIndex = 0;
    this.loadData();
  }

  toggleRow(row: AuditLog): void {
    this.expandedRow = this.expandedRow === row ? null : row;
  }

  private computeDiff(log: AuditLog): { before: DiffLine[]; after: DiffLine[] } {
    if (this.diffCache.has(log.id)) {
      return this.diffCache.get(log.id)!;
    }

    const before = log.beforeSnapshot || {};
    const after = log.afterSnapshot || {};

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    const beforeLines: DiffLine[] = [];
    const afterLines: DiffLine[] = [];

    for (const key of Array.from(allKeys).sort()) {
      const beforeVal = before[key];
      const afterVal = after[key];

      const beforeStr = this.stringifyValue(beforeVal);
      const afterStr = this.stringifyValue(afterVal);

      if (!(key in before)) {
        afterLines.push({ key, value: afterStr, type: 'added' });
        beforeLines.push({ key, value: '', type: 'added' });
      } else if (!(key in after)) {
        beforeLines.push({ key, value: beforeStr, type: 'removed' });
        afterLines.push({ key, value: '', type: 'removed' });
      } else if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        beforeLines.push({ key, value: beforeStr, type: 'modified' });
        afterLines.push({ key, value: afterStr, type: 'modified' });
      } else {
        beforeLines.push({ key, value: beforeStr, type: 'unchanged' });
        afterLines.push({ key, value: afterStr, type: 'unchanged' });
      }
    }

    const result = { before: beforeLines, after: afterLines };
    this.diffCache.set(log.id, result);
    return result;
  }

  private stringifyValue(val: any): string {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  getBeforeDiffLines(log: AuditLog): DiffLine[] {
    return this.computeDiff(log).before;
  }

  getAfterDiffLines(log: AuditLog): DiffLine[] {
    return this.computeDiff(log).after;
  }

  handleNewAuditLog(event: AuditLogCreatedEvent): void {
    if (this.pageIndex === 0) {
      const newLog: AuditLog = {
        id: event.id,
        actionType: event.actionType,
        operator: event.operator,
        resourceId: event.resourceId,
        resourceType: event.resourceType,
        beforeSnapshot: event.beforeSnapshot,
        afterSnapshot: event.afterSnapshot,
        ipAddress: event.ipAddress,
        durationMs: event.durationMs,
        createdAt: event.createdAt,
      };

      this.auditLogs = [newLog, ...this.auditLogs].slice(0, this.pageSize);
      this.newLogIds.add(newLog.id);
      this.total += 1;

      setTimeout(() => {
        this.newLogIds.delete(newLog.id);
        this.cdr.detectChanges();
      }, 3000);

      this.loadStats();
      this.cdr.detectChanges();
    }
  }
}
