import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Alert } from '../models';
import { MockDataService } from './mock-data.service';

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private mockData: MockDataService) {}

  getAlerts(params?: { limit?: number; unreadOnly?: boolean }): Observable<Alert[]> {
    return this.mockData.getAlerts(params);
  }

  markAlertRead(alertId: string): Observable<void> {
    return new Observable(subscriber => {
      subscriber.next();
      subscriber.complete();
    });
  }
}
