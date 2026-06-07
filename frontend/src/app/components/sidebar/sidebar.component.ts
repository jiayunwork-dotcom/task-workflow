import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatDividerModule],
  template: `
    <div class="sidebar" [class.collapsed]="collapsed">
      <div class="logo">
        <mat-icon class="logo-icon">account_tree</mat-icon>
        <span class="logo-text" *ngIf="!collapsed">任务工作流平台</span>
      </div>
      <mat-divider></mat-divider>
      <mat-nav-list>
        <a
          mat-list-item
          *ngFor="let item of navItems"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.route === '/' }"
        >
          <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
          <span matListItemTitle *ngIf="!collapsed">{{ item.label }}</span>
        </a>
      </mat-nav-list>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      background: #1e293b;
      color: #fff;
      height: 100vh;
      transition: width 0.3s ease;
      overflow: hidden;
    }
    .sidebar.collapsed {
      width: 64px;
    }
    .logo {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }
    .logo-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #60a5fa;
    }
    .logo-text {
      font-size: 18px;
      font-weight: 600;
      white-space: nowrap;
    }
    .mat-mdc-list-item {
      color: #cbd5e1;
    }
    .mat-mdc-list-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .mat-mdc-list-item.active {
      background: rgba(96, 165, 250, 0.2);
      color: #60a5fa;
    }
    .mat-mdc-list-item.active .mat-mdc-list-item-icon {
      color: #60a5fa;
    }
    ::ng-deep .mat-mdc-list-item-icon {
      color: #94a3b8 !important;
    }
    ::ng-deep .mat-divider {
      border-top-color: rgba(255, 255, 255, 0.1) !important;
    }
  `]
})
export class SidebarComponent {
  @Input() collapsed = false;

  navItems: NavItem[] = [
    { label: '仪表盘', icon: 'dashboard', route: '/' },
    { label: '工作流管理', icon: 'hub', route: '/workflows' },
    { label: '任务列表', icon: 'list_alt', route: '/tasks' },
    { label: '队列管理', icon: 'queue', route: '/queues' },
    { label: 'Worker监控', icon: 'memory', route: '/workers' },
    { label: '定时任务', icon: 'schedule', route: '/cron-jobs' }
  ];
}
