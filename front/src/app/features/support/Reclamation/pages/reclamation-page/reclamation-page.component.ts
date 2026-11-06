import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ReclamationVm } from '../../vm/reclamation.vm';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmService } from '../../../../../shared/ui/confirm-dialog/confirm.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';
import {
  Reclamation,
  ReclamationCreateRequest,
  ReclamationDashboard,
  ReclamationStatus,
  ReclamationCategory,
  Priority,
  PageResponse
} from '../../models/reclamation.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './reclamation-page.component.html',
  styleUrl: './reclamation-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReclamationPageComponent implements OnInit {
  private readonly vm = inject(ReclamationVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  reclamations: Reclamation[] = [];
  loading = false;
  error: string | null = null;

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  statusFilter: ReclamationStatus | '' = '';
  categoryFilter: ReclamationCategory | '' = '';
  subjectFilter = '';

  showCreate = false;
  creating = false;

  detailsReclamation: Reclamation | null = null;
  assignTargetId: number | null = null;
  assigning = false;

  dashboard: ReclamationDashboard | null = null;

  createForm: ReclamationCreateRequest = {
    userId: 0,
    subject: '',
    description: '',
    priority: 'MEDIUM',
    category: 'OTHER',
  };

  statuses: ReclamationStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'ESCALATED', 'REOPENED', 'RESOLVED', 'REJECTED'];
  categories: ReclamationCategory[] = ['PAYMENT', 'CREDIT', 'KYC', 'FRAUD', 'ACCOUNT', 'TECHNICAL_SUPPORT', 'OTHER'];
  priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId();
    if (userId) this.createForm.userId = userId;
    this.loadReclamations();
    if (this.isAdminOrAgent) {
      this.loadDashboard();
    }
  }

  get isAdminOrAgent(): boolean {
    return this.auth.isAdminOrAgent();
  }

  get openOnPage(): number {
    return this.reclamations.filter(r => r.status === 'OPEN').length;
  }

  get escalatedOnPage(): number {
    return this.reclamations.filter(r => r.status === 'ESCALATED').length;
  }

  loadDashboard(): void {
    this.vm.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.cdr.markForCheck();
      },
      error: () => { /* stats stay hidden when unavailable */ }
    });
  }

  loadReclamations(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const userId = this.auth.getCurrentUserId();
    const filters = {
      status: this.statusFilter,
      category: this.categoryFilter,
      q: this.subjectFilter,
    };

    const request$ = (!this.isAdminOrAgent && userId)
      ? this.vm.getByUser(userId, this.page, this.size, filters)
      : this.vm.getAll(this.page, this.size, filters);

    request$
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: PageResponse<Reclamation>) => {
          this.reclamations = res.content ?? [];
          this.totalPages = res.totalPages ?? 0;
          this.totalElements = res.totalElements ?? 0;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load reclamations.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadReclamations();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.categoryFilter = '';
    this.subjectFilter = '';
    this.page = 0;
    this.loadReclamations();
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadReclamations();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadReclamations();
    }
  }

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
    if (!this.showCreate) {
      this.resetCreateForm();
    }
    this.error = null;
    this.cdr.markForCheck();
  }

  private resetCreateForm(): void {
    this.createForm = {
      userId: this.auth.getCurrentUserId() ?? 0,
      subject: '',
      description: '',
      priority: 'MEDIUM',
      category: 'OTHER',
    };
  }

  async create(): Promise<void> {
    if (!this.createForm.userId || !this.createForm.subject.trim() || !this.createForm.description.trim()) {
      this.error = 'User, subject and description are required.';
      this.cdr.markForCheck();
      return;
    }

    const ok = await this.confirm.confirm({
      title: 'Submit reclamation',
      message: `Submit "${this.createForm.subject}" to the support team?`,
      confirmLabel: 'Submit',
    });
    if (!ok) return;

    this.creating = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.create({ ...this.createForm })
      .pipe(finalize(() => { this.creating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.toast.success('Reclamation created.');
          this.showCreate = false;
          this.resetCreateForm();
          this.page = 0;
          this.loadReclamations();
          if (this.isAdminOrAgent) this.loadDashboard();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to create reclamation.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  async updateStatus(r: Reclamation, status: ReclamationStatus, select?: HTMLSelectElement): Promise<void> {
    if (!r.reclamationId || r.status === status) return;

    const ok = await this.confirm.confirm({
      title: 'Update status',
      message: `Change reclamation #${r.reclamationId} status from ${r.status} to ${status}?`,
      confirmLabel: 'Update',
      danger: status === 'REJECTED',
    });
    if (!ok) {
      if (select) select.value = r.status ?? '';
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.updateStatus(r.reclamationId, status)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (updated) => {
          this.toast.success('Status updated.');
          this.reclamations = this.reclamations.map(x =>
            x.reclamationId === updated.reclamationId ? updated : x
          );
          if (this.detailsReclamation?.reclamationId === updated.reclamationId) {
            this.detailsReclamation = updated;
          }
          this.cdr.markForCheck();
          if (this.isAdminOrAgent) this.loadDashboard();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to update status.';
          this.error = msg;
          this.toast.error(msg);
          if (select) select.value = r.status ?? '';
          this.cdr.markForCheck();
        }
      });
  }

  openDetails(r: Reclamation): void {
    this.detailsReclamation = r;
    this.assignTargetId = r.assignedTo ?? null;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsReclamation = null;
    this.assignTargetId = null;
    this.cdr.markForCheck();
  }

  openRelated(r: Reclamation, path: 'messages' | 'history' | 'attachments'): void {
    if (!r.reclamationId) return;
    const routes: Record<string, string> = {
      messages: '/support/reclamation-messages',
      history: '/support/reclamation-history',
      attachments: '/support/reclamation-attachments',
    };
    this.router.navigate([routes[path]], { queryParams: { reclamationId: r.reclamationId } });
  }

  async assign(): Promise<void> {
    if (!this.detailsReclamation?.reclamationId || !this.assignTargetId) return;

    const ok = await this.confirm.confirm({
      title: 'Assign reclamation',
      message: `Assign reclamation #${this.detailsReclamation.reclamationId} to user #${this.assignTargetId}?`,
      confirmLabel: 'Assign',
    });
    if (!ok) return;

    this.assigning = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.assign(this.detailsReclamation.reclamationId, this.assignTargetId)
      .pipe(finalize(() => { this.assigning = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (updated) => {
          this.toast.success('Reclamation assigned.');
          this.detailsReclamation = updated;
          this.reclamations = this.reclamations.map(x =>
            x.reclamationId === updated.reclamationId ? updated : x
          );
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to assign reclamation.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase().replace(/_/g, '-')}`;
  }

  getPriorityClass(priority?: string): string {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'priority--high';
    if (p === 'low') return 'priority--low';
    return 'priority--medium';
  }

  getRiskClass(level?: string): string {
    return `risk--${(level || 'low').toLowerCase()}`;
  }

  trackByReclamationId(_index: number, r: Reclamation): number | undefined {
    return r.reclamationId;
  }
}
