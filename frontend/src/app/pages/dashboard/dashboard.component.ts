import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { MockDataService } from '../../services/mock-data.service';
import { DashboardStats, QueueDepthItem, TaskTrendItem, Alert } from '../../models';
import { DateFormatPipe, RelativeTimePipe } from '../../pipes/date-format.pipe';
import { AlertColorPipe, AlertLevelPipe } from '../../pipes/status.pipe';
import { RealtimeService } from '../../services/realtime.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    NgChartsModule,
    DateFormatPipe,
    RelativeTimePipe,
    AlertColorPipe,
    AlertLevelPipe
  ],
  template: `
    <div class="dashboard">
      <h2 class="page-title">系统概览</h2>
      
      <div class="stats-grid" *ngIf="stats; else loading">
        <mat-card class="stat-card" *ngFor="let card of statCards" [style.borderTopColor]="card.color">
          <div class="stat-icon" [style.background]="card.color + '20'">
            <mat-icon [style.color]="card.color">{{ card.icon }}</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-trend" *ngIf="card.trend">{{ card.trend }}</div>
          </div>
        </mat-card>
      </div>

      <div class="charts-grid">
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>队列深度</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container" *ngIf="barChartData">
              <canvas baseChart
                [data]="barChartData"
                [options]="barChartOptions"
                [type]="barChartType">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>近1小时任务趋势</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container" *ngIf="lineChartData">
              <canvas baseChart
                [data]="lineChartData"
                [options]="lineChartOptions"
                [type]="lineChartType">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="alerts-card">
        <mat-card-header>
          <mat-card-title>待处理告警</mat-card-title>
          <button mat-button color="primary">查看全部</button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="alerts" class="alerts-table">
            <ng-container matColumnDef="level">
              <th mat-header-cell *matHeaderCellDef>级别</th>
              <td mat-cell *matCellDef="let alert">
                <span class="alert-badge" [style.background]="alert.level | alertColor">
                  {{ alert.level | alertLevel }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>标题</th>
              <td mat-cell *matCellDef="let alert">{{ alert.title }}</td>
            </ng-container>
            <ng-container matColumnDef="message">
              <th mat-header-cell *matHeaderCellDef>消息</th>
              <td mat-cell *matCellDef="let alert">{{ alert.message }}</td>
            </ng-container>
            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>时间</th>
              <td mat-cell *matCellDef="let alert">{{ alert.createdAt | relativeTime }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>操作</th>
              <td mat-cell *matCellDef="let alert">
                <button mat-icon-button *ngIf="!alert.isRead">
                  <mat-icon>mark_email_read</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="alertColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: alertColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 0;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      border-radius: 8px;
      border-top: 4px solid;
    }
    .stat-card .mdc-card__content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }
    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stat-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .stat-content {
      flex: 1;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }
    .stat-label {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    .stat-trend {
      font-size: 12px;
      color: #10b981;
      margin-top: 4px;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .chart-card {
      border-radius: 8px;
    }
    .chart-card .mat-mdc-card-header {
      padding: 16px 20px;
    }
    .chart-card .mat-mdc-card-content {
      padding: 0 20px 20px;
    }
    .chart-container {
      height: 300px;
      position: relative;
    }
    .alerts-card {
      border-radius: 8px;
    }
    .alerts-card .mat-mdc-card-header {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .alerts-table {
      width: 100%;
    }
    .alert-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 100px;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  stats?: DashboardStats;
  alerts: Alert[] = [];
  alertColumns = ['level', 'title', 'message', 'time', 'actions'];
  
  statCards: StatCard[] = [];
  
  barChartType: ChartType = 'bar';
  barChartData?: ChartData<'bar'>;
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  lineChartType: ChartType = 'line';
  lineChartData?: ChartData<'line'>;
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  constructor(
    private mockData: MockDataService,
    private realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.realtimeService.dashboardUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.mockData.getDashboardStats().subscribe(stats => {
      this.stats = stats;
      this.statCards = [
        { label: '活跃Worker', value: stats.activeWorkers, icon: 'memory', color: '#3b82f6' },
        { label: '队列总数', value: stats.totalQueues, icon: 'queue', color: '#8b5cf6' },
        { label: '队列总深度', value: stats.totalDepth, icon: 'layers', color: '#f59e0b' },
        { label: '近1小时完成', value: stats.tasksCompletedLastHour, icon: 'check_circle', color: '#10b981' },
        { label: '近1小时失败', value: stats.tasksFailedLastHour, icon: 'error', color: '#ef4444' },
        { label: '待处理告警', value: stats.pendingAlerts, icon: 'notifications', color: '#ec4899' }
      ];
    });

    this.mockData.getQueueDepths().subscribe(depths => {
      this.barChartData = {
        labels: depths.map(d => d.name),
        datasets: [{
          data: depths.map(d => d.value),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      };
    });

    this.mockData.getTaskTrend().subscribe(trend => {
      this.lineChartData = {
        labels: trend.map(t => t.time),
        datasets: [
          {
            label: '完成',
            data: trend.map(t => t.completed),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: '失败',
            data: trend.map(t => t.failed),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      };
    });

    this.mockData.getAlerts({ limit: 5, unreadOnly: true }).subscribe(alerts => {
      this.alerts = alerts;
    });
  }
}
