import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, interval, Subscription } from 'rxjs';
import { switchMap, share, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private pollingSubscription?: Subscription;
  private dashboardUpdateSubject = new Subject<void>();
  private taskUpdateSubject = new Subject<void>();

  dashboardUpdate$ = this.dashboardUpdateSubject.asObservable();
  taskUpdate$ = this.taskUpdateSubject.asObservable();

  constructor(private apiService: ApiService) {}

  startPolling(): void {
    if (this.pollingSubscription) return;
    
    this.pollingSubscription = interval(environment.pollingInterval)
      .subscribe(() => {
        this.dashboardUpdateSubject.next();
        this.taskUpdateSubject.next();
      });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
