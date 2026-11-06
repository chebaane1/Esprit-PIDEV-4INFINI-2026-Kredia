import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { NotificationVm } from '../../vm/notification.vm';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmService } from '../../../../../shared/ui/confirm-dialog/confirm.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';
import { Notification, NotificationType, PageResponse } from '../../models/notification.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './notification-page.component.html',
  styleUrl: './notification-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationPageComponent implements OnInit {
  private readonly vm = inject(NotificationVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  notifications: Notification[] = [];
  loading = false;
  error: string | null = null;

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;
  unreadTotal = 0;

  readFilter: '' | 'unread' | 'read' = '';
  typeFilter: NotificationType | '' = '';
  searchFilter = '';

  showCreate = false;
  creating = false;
  markingAll = false;

  detailsNotification: Notification | null = null;

  createForm = {
    userId: null as number | null,
    reclamationId: null as number | null,
    type: 'EMAIL' as NotificationType,
    title: '',
    message: '',
  };

  types: NotificationType[] = ['SMS', 'EMAIL', 'PUSH'];

  get isClient(): boolean {
    return this.auth.isClient();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      this.error = 'You must be logged in.';
      this.cdr.markForCheck();
      return;
    }
    this.createForm.userId = userId;
    this.loadNotifications();
    this.loadSummary();
  }

  get unreadOnPage(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  private currentUserId(): number | null {
    return this.auth.getCurrentUserId();
  }

  loadNotifications(): void {
    const userId = this.currentUserId();
    if (!userId) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const filters = {
      isRead: this.readFilter === '' ? undefined : this.readFilter === 'read',
      type: this.typeFilter,
      q: this.searchFilter,
    };

    this.vm.getByUser(userId, filters, this.page, this.size)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: PageResponse<Notification>) => {
          this.notifications = res.content ?? [];
          this.totalPages = res.totalPages ?? 0;
          this.totalElements = res.totalElements ?? 0;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load notifications.';
          this.cdr.markForCheck();
        }
      });
  }

  loadSummary(): void {
    const userId = this.currentUserId();
    if (!userId) return;

    forkJoin({
      all: this.vm.getByUser(userId, {}, 0, 1),
      unread: this.vm.getByUser(userId, { isRead: false }, 0, 1),
    }).subscribe({
      next: ({ all, unread }) => {
        this.unreadTotal = unread.totalElements ?? 0;
        if (!this.totalElements) this.totalElements = all.totalElements ?? 0;
        this.cdr.markForCheck();
      },
      error: () => { /* optional summary */ }
    });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadNotifications();
  }

  resetFilters(): void {
    this.readFilter = '';
    this.typeFilter = '';
    this.searchFilter = '';
    this.applyFilters();
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadNotifications();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadNotifications();
    }
  }

  markAsRead(n: Notification): void {
    if (!n.notificationId || n.isRead) return;

    this.vm.markAsRead(n.notificationId).subscribe({
      next: (updated) => {
        this.notifications = this.notifications.map(x =>
          x.notificationId === n.notificationId ? { ...x, ...updated, isRead: true } : x
        );
        this.unreadTotal = Math.max(0, this.unreadTotal - 1);
        this.toast.success('Notification marked as read.');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to mark as read.';
        this.error = msg;
        this.toast.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  markAllAsRead(): void {
    const userId = this.currentUserId();
    if (!userId) return;

    const ok = this.confirm.confirm({
      title: 'Mark all as read',
      message: 'Mark every unread notification as read?',
      confirmLabel: 'Mark all read',
    });
    ok.then((confirmed) => {
      if (!confirmed) return;
      this.markingAll = true;
      this.cdr.markForCheck();

      this.vm.getByUser(userId, { isRead: false }, 0, 200)
        .subscribe({
          next: (res) => {
            const unread = res.content ?? [];
            if (!unread.length) {
              this.markingAll = false;
              this.cdr.markForCheck();
              return;
            }
            const calls = unread
              .filter(n => !!n.notificationId)
              .map(n => this.vm.markAsRead(n.notificationId!));

            forkJoin(calls.length ? calls : [of(null)])
              .pipe(finalize(() => { this.markingAll = false; this.cdr.markForCheck(); }))
              .subscribe({
                next: () => {
                  this.toast.success('All notifications marked as read.');
                  this.loadNotifications();
                  this.loadSummary();
                },
                error: (err: any) => {
                  const msg = err?.error?.message ?? 'Unable to mark all notifications as read.';
                  this.error = msg;
                  this.toast.error(msg);
                  this.cdr.markForCheck();
                }
              });
          },
          error: (err: any) => {
            this.markingAll = false;
            this.error = err?.error?.message ?? 'Unable to load unread notifications.';
            this.cdr.markForCheck();
          }
        });
    });
  }

  async delete(n: Notification): Promise<void> {
    if (!n.notificationId) return;

    const ok = await this.confirm.confirm({
      title: 'Delete notification',
      message: `Delete "${n.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    this.vm.delete(n.notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.notificationId !== n.notificationId);
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.toast.success('Notification deleted.');
        if (this.detailsNotification?.notificationId === n.notificationId) {
          this.detailsNotification = null;
        }
        if (this.notifications.length === 0 && this.page > 0) {
          this.page--;
          this.loadNotifications();
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to delete notification.';
        this.error = msg;
        this.toast.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
    if (!this.showCreate) {
      this.createForm = {
        userId: this.currentUserId(),
        reclamationId: null,
        type: 'EMAIL',
        title: '',
        message: '',
      };
    }
    this.error = null;
    this.cdr.markForCheck();
  }

  async create(): Promise<void> {
    if (!this.createForm.userId || !this.createForm.title.trim() || !this.createForm.message.trim()) {
      this.error = 'User, title and message are required.';
      this.cdr.markForCheck();
      return;
    }

    const ok = await this.confirm.confirm({
      title: 'Send notification',
      message: `Send a ${this.createForm.type} notification to user #${this.createForm.userId}?`,
      confirmLabel: 'Send',
    });
    if (!ok) return;

    this.creating = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.create({
      userId: this.createForm.userId,
      reclamationId: this.createForm.reclamationId || undefined,
      type: this.createForm.type,
      title: this.createForm.title.trim(),
      message: this.createForm.message.trim(),
    })
      .pipe(finalize(() => { this.creating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.toast.success('Notification created.');
          this.showCreate = false;
          this.createForm = {
            userId: this.currentUserId(),
            reclamationId: null,
            type: 'EMAIL',
            title: '',
            message: '',
          };
          this.page = 0;
          this.loadNotifications();
          this.loadSummary();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to create notification.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  openDetails(n: Notification): void {
    this.detailsNotification = n;
    if (!n.isRead) this.markAsRead(n);
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsNotification = null;
    this.cdr.markForCheck();
  }

  getStatusClass(isRead: boolean): string {
    return isRead ? 'status--read' : 'status--unread';
  }

  typeIcon(type: NotificationType): string {
    switch (type) {
      case 'EMAIL': return '✉';
      case 'SMS': return '💬';
      default: return '🔔';
    }
  }

  trackByNotificationId(_index: number, n: Notification): number | undefined {
    return n.notificationId;
  }
}
