import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationApi, NotificationFilters } from '../data-access/notification.api';
import { Notification, NotificationCreateRequest, PageResponse } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationVm {
  private readonly api = inject(NotificationApi);

  getByUser(
    userId: number,
    filters: NotificationFilters = {},
    page = 0,
    size = 10
  ): Observable<PageResponse<Notification>> {
    return this.api.getByUser(userId, filters, page, size);
  }

  create(payload: NotificationCreateRequest): Observable<Notification> {
    return this.api.create(payload);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.api.markAsRead(id);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }
}
