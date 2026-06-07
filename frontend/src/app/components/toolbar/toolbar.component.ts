import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';
import { AlertColorPipe, AlertLevelPipe } from '../../pipes/status.pipe';
import { RelativeTimePipe } from '../../pipes/date-format.pipe';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatIconModule, MatButtonModule, MatBadgeModule, MatMenuModule, MatDividerModule, AlertColorPipe, AlertLevelPipe, RelativeTimePipe],
  template: `
    <mat-toolbar class="app-toolbar">
      <button mat-icon-button (click)="toggleSidebar.emit()">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="alertMenu" class="alert-btn">
        <mat-badge [content]="unreadCount" color="warn" *ngIf="unreadCount > 0">
          <mat-icon>notifications</mat-icon>
        </mat-badge>
        <mat-icon *ngIf="unreadCount === 0">notifications</mat-icon>
      </button>
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
    </mat-toolbar>

    <mat-menu #alertMenu="matMenu" class="alert-menu">
      <div class="alert-header">
        <span>告警通知</span>
        <button mat-button color="primary" (click)="markAllRead()">全部已读</button>
      </div>
      <mat-divider></mat-divider>
      <div class="alert-list">
        <button mat-menu-item *ngFor="let alert of recentAlerts" (click)="viewAlert(alert)">
          <mat-icon [style.color]="alert.level | alertColor">{{ alert.level === 'CRITICAL' ? 'error' : alert.level === 'ERROR' ? 'warning' : alert.level === 'WARNING' ? 'info' : 'notifications' }}</mat-icon>
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-time">{{ alert.createdAt | relativeTime }}</div>
          </div>
          <span class="unread-dot" *ngIf="!alert.isRead"></span>
        </button>
        <button mat-menu-item class="view-all" routerLink="/alerts">
          查看全部告警
        </button>
      </div>
    </mat-menu>

    <mat-menu #userMenu="matMenu">
      <div class="user-info">
        <div class="user-name">{{ currentUser?.name }}</div>
        <div class="user-email">{{ currentUser?.email }}</div>
      </div>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span>退出登录</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .app-toolbar {
      background: #fff;
      color: #1e293b;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      height: 64px;
    }
    .spacer {
      flex: 1;
    }
    .alert-btn {
      margin-right: 8px;
    }
    .alert-header {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      min-width: 320px;
    }
    .alert-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .alert-content {
      flex: 1;
      margin-left: 12px;
    }
    .alert-title {
      font-size: 14px;
      color: #1e293b;
    }
    .alert-time {
      font-size: 12px;
      color: #64748b;
    }
    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      margin-left: 8px;
    }
    .view-all {
      justify-content: center;
      color: #3b82f6;
    }
    .user-info {
      padding: 12px 16px;
    }
    .user-name {
      font-weight: 600;
      color: #1e293b;
    }
    .user-email {
      font-size: 12px;
      color: #64748b;
    }
  `]
})
export class ToolbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentUser = this.authService.getCurrentUser();
  unreadCount = 0;
  recentAlerts: any[] = [];

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.alertService.getAlerts({ limit: 5, unreadOnly: false }).subscribe(alerts => {
      this.recentAlerts = alerts;
      this.unreadCount = alerts.filter(a => !a.isRead).length;
    });
  }

  markAllRead(): void {
    this.recentAlerts.forEach(alert => {
      if (!alert.isRead) {
        this.alertService.markAlertRead(alert.id).subscribe();
      }
    });
    this.unreadCount = 0;
  }

  viewAlert(alert: any): void {
    if (!alert.isRead) {
      this.alertService.markAlertRead(alert.id).subscribe(() => {
        alert.isRead = true;
        this.unreadCount--;
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
