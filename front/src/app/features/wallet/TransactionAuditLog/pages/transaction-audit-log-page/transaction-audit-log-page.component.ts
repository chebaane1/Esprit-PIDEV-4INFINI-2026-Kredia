import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { TransactionAuditLogVm } from '../../vm/transaction-audit-log.vm';
import { TransactionAuditLog } from '../../models/transaction-audit-log.model';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './transaction-audit-log-page.component.html',
  styleUrl: './transaction-audit-log-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionAuditLogPageComponent implements OnInit {
  private readonly vm = inject(TransactionAuditLogVm);
  private readonly cdr = inject(ChangeDetectorRef);

  allLogs: TransactionAuditLog[] = [];
  filteredLogs: TransactionAuditLog[] = [];
  logs: TransactionAuditLog[] = [];
  loading = false;
  error: string | null = null;

  page = 0;
  size = 10;
  totalPages = 0;

  transactionIdFilter: number | null = null;
  hashFilter = '';

  detailsLog: TransactionAuditLog | null = null;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.findAll()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.allLogs = [...(data ?? [])].sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return db - da;
          });
          this.applyFilters(false);
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load audit logs.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(resetPage = true): void {
    let list = [...this.allLogs];

    if (this.transactionIdFilter) {
      list = list.filter(l => l.transactionId === this.transactionIdFilter);
    }

    const q = this.hashFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(l =>
        (l.dataHash || '').toLowerCase().includes(q) ||
        (l.previousHash || '').toLowerCase().includes(q) ||
        (l.blockchainTxHash || '').toLowerCase().includes(q)
      );
    }

    this.filteredLogs = list;
    if (resetPage) this.page = 0;
    this.paginate();
  }

  resetFilters(): void {
    this.transactionIdFilter = null;
    this.hashFilter = '';
    this.applyFilters();
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.paginate();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.paginate();
    }
  }

  private paginate(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredLogs.length / this.size));
    if (this.page > this.totalPages - 1) this.page = this.totalPages - 1;
    const start = this.page * this.size;
    this.logs = this.filteredLogs.slice(start, start + this.size);
    this.cdr.markForCheck();
  }

  openDetails(log: TransactionAuditLog): void {
    this.detailsLog = log;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsLog = null;
    this.cdr.markForCheck();
  }

  shortHash(hash?: string | null): string {
    if (!hash) return '—';
    if (hash.length <= 18) return hash;
    return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  }

  trackByLogId(_index: number, log: TransactionAuditLog): number | undefined {
    return log.logId;
  }
}
