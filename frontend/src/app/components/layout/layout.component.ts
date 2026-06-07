import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, ToolbarComponent],
  template: `
    <div class="layout-container">
      <app-sidebar [collapsed]="sidebarCollapsed"></app-sidebar>
      <div class="main-content">
        <app-toolbar (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed"></app-toolbar>
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .content-wrapper {
      flex: 1;
      overflow: auto;
      padding: 24px;
      background: #f1f5f9;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;

  constructor(private realtimeService: RealtimeService) {}

  ngOnInit(): void {
    this.realtimeService.startPolling();
  }

  ngOnDestroy(): void {
    this.realtimeService.stopPolling();
  }
}
