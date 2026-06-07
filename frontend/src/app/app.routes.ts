import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { WorkflowsComponent } from './pages/workflows/workflows.component';
import { WorkflowInstanceDetailComponent } from './pages/workflow-instance-detail/workflow-instance-detail.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { QueuesComponent } from './pages/queues/queues.component';
import { WorkersComponent } from './pages/workers/workers.component';
import { CronJobsComponent } from './pages/cron-jobs/cron-jobs.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardComponent, pathMatch: 'full' },
      { path: 'workflows', component: WorkflowsComponent },
      { path: 'workflow-instances/:id', component: WorkflowInstanceDetailComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'queues', component: QueuesComponent },
      { path: 'workers', component: WorkersComponent },
      { path: 'cron-jobs', component: CronJobsComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
