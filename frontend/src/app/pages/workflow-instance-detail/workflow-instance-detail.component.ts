import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { WorkflowInstance, WorkflowStepInstance } from '../../models';
import { MockDataService } from '../../services/mock-data.service';
import { DateFormatPipe, DurationPipe } from '../../pipes/date-format.pipe';
import { TaskStatusPipe, StatusColorPipe } from '../../pipes/status.pipe';
import { DagGraphComponent } from '../../components/dag-graph/dag-graph.component';

@Component({
  selector: 'app-workflow-instance-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    DateFormatPipe,
    DurationPipe,
    TaskStatusPipe,
    StatusColorPipe,
    DagGraphComponent
  ],
  template: `
    <div class="instance-detail" *ngIf="instance; else loading">
      <div class="page-header">
        <div>
          <button mat-icon-button routerLink="/workflow-instances">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h2 class="page-title">{{ instance.workflowName }}</h2>
          <span class="instance-id">实例ID: {{ instance.id }}</span>
        </div>
        <div class="header-actions">
          <span class="status-badge" [style.background]="instance.status | statusColor">
            {{ instance.status | taskStatus }}
          </span>
        </div>
      </div>

      <div class="info-cards">
        <mat-card class="info-card">
          <div class="info-item">
            <span class="info-label">开始时间</span>
            <span class="info-value">{{ instance.startedAt | dateFormat }}</span>
          </div>
        </mat-card>
        <mat-card class="info-card">
          <div class="info-item">
            <span class="info-label">完成时间</span>
            <span class="info-value">{{ instance.completedAt | dateFormat }}</span>
          </div>
        </mat-card>
        <mat-card class="info-card">
          <div class="info-item">
            <span class="info-label">执行耗时</span>
            <span class="info-value">{{ instance.startedAt | duration:instance.completedAt }}</span>
          </div>
        </mat-card>
      </div>

      <div class="content-grid">
        <mat-card class="dag-card">
          <mat-card-header>
            <mat-card-title>执行进度</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-dag-graph [graph]="dagGraph"></app-dag-graph>
          </mat-card-content>
        </mat-card>

        <mat-card class="steps-card">
          <mat-card-header>
            <mat-card-title>步骤详情</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-accordion>
              <mat-expansion-panel *ngFor="let step of instance.steps">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <span class="step-indicator" [style.background]="step.status | statusColor"></span>
                    {{ step.stepName }}
                  </mat-panel-title>
                  <mat-panel-description>
                    <span class="status-text" [style.color]="step.status | statusColor">
                      {{ step.status | taskStatus }}
                    </span>
                  </mat-panel-description>
                </mat-expansion-panel-header>
                
                <div class="step-detail">
                  <div class="detail-row">
                    <span class="detail-label">状态</span>
                    <span class="status-badge small" [style.background]="step.status | statusColor">
                      {{ step.status | taskStatus }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">重试次数</span>
                    <span>{{ step.retryCount }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">开始时间</span>
                    <span>{{ step.startedAt | dateFormat }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">完成时间</span>
                    <span>{{ step.completedAt | dateFormat }}</span>
                  </div>
                  <div class="detail-row" *ngIf="step.error">
                    <span class="detail-label">错误信息</span>
                    <span class="error-text">{{ step.error }}</span>
                  </div>

                  <div class="logs-section" *ngIf="step.logs && step.logs.length > 0">
                    <h4>执行日志</h4>
                    <div class="logs-container">
                      <div *ngFor="let log of step.logs" class="log-item">
                        <span class="log-text">{{ log }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="step-actions" *ngIf="step.status === 'FAILED'">
                    <button mat-raised-button color="primary" (click)="retryStep(step)">
                      <mat-icon>refresh</mat-icon>
                      重试步骤
                    </button>
                  </div>
                </div>
              </mat-expansion-panel>
            </mat-accordion>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .instance-detail {
      padding: 0;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-header > div:first-child {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
      display: inline-block;
    }
    .instance-id {
      font-size: 14px;
      color: #64748b;
      margin-left: 12px;
    }
    .status-badge {
      padding: 6px 12px;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
    }
    .status-badge.small {
      padding: 2px 8px;
      font-size: 12px;
    }
    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-card {
      border-radius: 8px;
    }
    .info-item {
      padding: 16px;
    }
    .info-label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 500;
      color: #1e293b;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .dag-card, .steps-card {
      border-radius: 8px;
    }
    .step-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 12px;
    }
    .status-text {
      font-weight: 500;
    }
    .step-detail {
      padding: 8px 0;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .detail-label {
      width: 100px;
      color: #64748b;
      font-size: 14px;
    }
    .error-text {
      color: #ef4444;
    }
    .logs-section {
      margin-top: 16px;
    }
    .logs-section h4 {
      margin: 0 0 8px 0;
      color: #1e293b;
    }
    .logs-container {
      background: #1e293b;
      border-radius: 4px;
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
    .log-item {
      color: #e2e8f0;
      font-family: monospace;
      font-size: 13px;
      padding: 2px 0;
    }
    .step-actions {
      margin-top: 16px;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 100px;
    }
  `]
})
export class WorkflowInstanceDetailComponent implements OnInit {
  instance?: WorkflowInstance;
  selectedStep?: WorkflowStepInstance;

  constructor(
    private route: ActivatedRoute,
    private mockData: MockDataService
  ) {}

  ngOnInit(): void {
    const instanceId = this.route.snapshot.params['id'];
    if (instanceId) {
      this.loadInstance(instanceId);
    }
  }

  loadInstance(id: string): void {
    this.mockData.getWorkflowInstance(id).subscribe(instance => {
      this.instance = instance;
    });
  }

  get dagGraph() {
    if (!this.instance) return { nodes: [], edges: [] };
    
    const edges: { source: string; target: string }[] = [];
    const stepMap = new Map(this.instance.steps.map(s => [s.stepId, s]));
    
    this.instance.steps.forEach(step => {
      const stepDef = this.getStepDefinition(step.stepId);
      stepDef?.dependsOn.forEach(depId => {
        if (stepMap.has(depId)) {
          edges.push({ source: depId, target: step.stepId });
        }
      });
    });
    
    return {
      nodes: this.instance.steps.map(s => ({ id: s.stepId, label: s.stepName, status: s.status })),
      edges
    };
  }

  private getStepDefinition(stepId: string) {
    const mockSteps = [
      { id: 'step-1', dependsOn: [] },
      { id: 'step-2', dependsOn: ['step-1'] },
      { id: 'step-3', dependsOn: ['step-1'] },
      { id: 'step-4', dependsOn: ['step-2', 'step-3'] }
    ];
    return mockSteps.find(s => s.id === stepId);
  }

  retryStep(step: WorkflowStepInstance): void {
    if (this.instance) {
      this.mockData.retryStep(this.instance.id, step.stepId).subscribe(() => {
        this.loadInstance(this.instance!.id);
      });
    }
  }
}
