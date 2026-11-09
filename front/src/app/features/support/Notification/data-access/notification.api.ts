import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { Notification, NotificationCreateRequest, NotificationType, PageResponse } from '../models/notification.model';

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType | '';
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApi {
  constructor(private readonly http: HttpClient) {}

  getByUser(userId: number, filters: NotificationFilters = {}, page = 0, size = 10): Observable<PageResponse<Notification>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (filters.isRead !== undefined) params = params.set('isRead', String(filters.isRead));
    if (filters.type) params = params.set('type', filters.type);
    if (filters.q && filters.q.trim()) params = params.set('q', filters.q.trim());
    return this.http.get<PageResponse<Notification>>(
      `${API_BASE_URL}/api/notifications/by-user/${userId}`,
      { params }
    );
  }

  create(payload: NotificationCreateRequest): Observable<Notification> {
    return this.http.post<Notification>(`${API_BASE_URL}/api/notifications`, payload);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.patch<Notification>(`${API_BASE_URL}/api/notifications/${id}/read`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/api/notifications/${id}`);
  }
}
