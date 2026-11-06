export type NotificationType = 'SMS' | 'EMAIL' | 'PUSH';

export interface Notification {
  notificationId?: number;
  userId: number;
  reclamationId?: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  sentAt?: string;
}

export interface NotificationCreateRequest {
  userId: number;
  reclamationId?: number;
  type: NotificationType;
  title: string;
  message: string;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}