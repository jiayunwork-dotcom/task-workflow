import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WorkflowDefinition } from '../../models';
import { MockDataService } from '../../services/mock-data.service';
import { DateFormatPipe } from '../../pipes/date-format.pipe';
import { TaskStatusPipe, StatusColorPipe } from '../../pipes/status.pipe';
import { DagGraphComponent } from '../../components/dag-graph/dag-graph.component';

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatTabsModule,
    MatPaginatorModule,
    DateFormatPipe,
    TaskStatusPipe,
    StatusColorPipe,
    DagGraphComponent
  ],
  template: `
    <div class="workflows-page">
      <div class="page-header">
        <h2 class="page-title">工作流管理</h2>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          新建工作流
        </button>
      </div>

      <mat-card class="workflows-card">
        <table mat-table [dataSource]="workflows" class="workflows-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>名称</th>
            <td mat-cell *matCellDef="let wf">
              <div class="workflow-name">{{ wf.name }}</div>
              <div class="workflow-desc">{{ wf.description }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="steps">
            <th mat-header-cell *matHeaderCellDef>步骤数</th>
            <td mat-cell *matCellDef="let wf">{{ wf.steps.length }}</td>
          </ng-container>
          <ng-container matColumnDef="version">
            <th mat-header-cell *matHeaderCellDef>版本</th>
            <td mat-cell *matCellDef="let wf">v{{ wf.version }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>状态</th>
            <td mat-cell *matCellDef="let wf">
              <span class="status-badge" [style.background]="wf.isActive ? '#10b981' : '#94a3b8'">
                {{ wf.isActive ? '启用' : '停用' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="updatedAt">
            <th mat-header-cell *matHeaderCellDef>更新时间</th>
            <td mat-cell *matCellDef="let wf">{{ wf.updatedAt | dateFormat }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>操作</th>
            <td mat-cell *matCellDef="let wf">
              <button mat-icon-button (click)="openTriggerDialog(wf)" matTooltip="触发">
                <mat-icon>play_arrow</mat-icon>
              </button>
              <button mat-icon-button (click)="openEditDialog(wf)" matTooltip="编辑">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="openViewDialog(wf)" matTooltip="查看DAG">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button [routerLink]="['/workflow-instances']" [queryParams]="{ workflowId: wf.id }" matTooltip="实例列表">
                <mat-icon>list_alt</mat-icon>
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
    .workflows-page {
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
    .workflows-card {
      border-radius: 8px;
    }
    .workflows-table {
      width: 100%;
    }
    .workflow-name {
      font-weight: 500;
      color: #1e293b;
    }
    .workflow-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
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
export class WorkflowsComponent implements OnInit {
  workflows: WorkflowDefinition[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  displayedColumns = ['name', 'steps', 'version', 'status', 'updatedAt', 'actions'];

  constructor(
    private mockData: MockDataService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.mockData.getWorkflows({ page: this.pageIndex, size: this.pageSize })
      .subscribe(result => {
        this.workflows = result.items;
        this.total = result.total;
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadWorkflows();
  }

  openCreateDialog(): void {
    // 创建工作流对话框
  }

  openEditDialog(workflow: WorkflowDefinition): void {
    // 编辑工作流对话框
  }

  openViewDialog(workflow: WorkflowDefinition): void {
    this.dialog.open(WorkflowDagDialogComponent, {
      width: '800px',
      data: workflow
    });
  }

  openTriggerDialog(workflow: WorkflowDefinition): void {
    const dialogRef = this.dialog.open(TriggerWorkflowDialogComponent, {
      width: '500px',
      data: workflow
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.mockData.triggerWorkflow(workflow.id, result.inputData).subscribe(() => {
          // 触发成功
        });
      }
    });
  }
}

@Component({
  selector: 'app-workflow-dag-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, DagGraphComponent],
  template: `
    <h2 mat-dialog-title>{{ data.name }} - DAG图</h2>
    <mat-dialog-content>
      <app-dag-graph [graph]="dagGraph"></app-dag-graph>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>关闭</button>
    </mat-dialog-actions>
  `
})
export class WorkflowDagDialogComponent {
  data: WorkflowDefinition;

  constructor(@Inject(MAT_DIALOG_DATA) data: WorkflowDefinition) {
    this.data = data;
  }

  get dagGraph() {
    return {
      nodes: this.data.steps.map(s => ({ id: s.id, label: s.name })),
      edges: this.data.steps.flatMap(s =>
        s.dependsOn.map(dep => ({ source: dep, target: s.id }))
      )
    };
  }
}

@Component({
  selector: 'app-trigger-workflow-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>触发工作流</h2>
    <mat-dialog-content>
      <p>确定要触发工作流「{{ data.name }}」吗？</p>
      <mat-form-field class="full-width" style="margin-top: 16px;">
        <textarea matInput placeholder="输入数据 (JSON)" rows="4" [formControl]="inputDataControl"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="{ inputData: parsedInputData }">
        确认触发
      </button>
    </mat-dialog-actions>
  `,
  styles: ['.full-width { width: 100%; }']
})
export class TriggerWorkflowDialogComponent {
  data: WorkflowDefinition;
  inputDataControl = this.fb.control('');

  constructor(@Inject(MAT_DIALOG_DATA) data: WorkflowDefinition, private fb: FormBuilder) {
    this.data = data;
  }

  get parsedInputData(): Record<string, any> | undefined {
    try {
      const value = this.inputDataControl.value;
      return value ? JSON.parse(value) : undefined;
    } catch {
      return undefined;
    }
  }
}
