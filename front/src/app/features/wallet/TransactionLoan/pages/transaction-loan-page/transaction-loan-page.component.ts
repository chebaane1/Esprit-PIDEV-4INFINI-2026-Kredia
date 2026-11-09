import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { TransactionLoanVm } from '../../vm/transaction-loan.vm';
import { TransactionLoan, TransactionStatus } from '../../models/transaction-loan.model';
import { WalletVm } from '../../../Wallet/vm/wallet.vm';
import { Wallet } from '../../../Wallet/models/wallet.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './transaction-loan-page.component.html',
  styleUrl: './transaction-loan-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionLoanPageComponent implements OnInit {
  private readonly vm = inject(TransactionLoanVm);
  private readonly walletVm = inject(WalletVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  allLoans: TransactionLoan[] = [];
  filteredLoans: TransactionLoan[] = [];
  loans: TransactionLoan[] = [];
  wallets: Wallet[] = [];
  loading = false;
  error: string | null = null;

  page = 0;
  size = 10;
  totalPages = 0;

  statusFilter: TransactionStatus | '' = '';
  referenceFilter = '';
  walletFilter: number | null = null;

  detailsLoan: TransactionLoan | null = null;

  statuses: TransactionStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'SUSPECTED_FRAUD'];

  get isClient(): boolean {
    return this.auth.isClient();
  }

  get totalRepaid(): number {
    return this.filteredLoans
      .filter(l => l.status === 'COMPLETED')
      .reduce((sum, l) => sum + Number(l.amount ?? 0), 0);
  }

  get completedCount(): number {
    return this.filteredLoans.filter(l => l.status === 'COMPLETED').length;
  }

  get pendingCount(): number {
    return this.filteredLoans.filter(l => l.status === 'PENDING').length;
  }

  ngOnInit(): void {
    this.loadWallets();
    this.loadLoans();
  }

  loadWallets(): void {
    const request$ = this.isClient ? this.walletVm.findMine() : this.walletVm.findAll();
    request$.subscribe({
      next: (wallets) => {
        this.wallets = wallets ?? [];
        this.cdr.markForCheck();
      },
      error: () => { /* optional */ }
    });
  }

  loadLoans(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.findAll()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.allLoans = (data ?? [])
            .filter(t => t.dtype === 'TRANSACTION_LOAN')
            .sort((a, b) => {
              const da = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
              const db = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
              return db - da;
            });
          this.applyFilters(false);
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load loan transactions.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(resetPage = true): void {
    let list = [...this.allLoans];

    if (this.statusFilter) {
      list = list.filter(t => t.status === this.statusFilter);
    }

    const q = this.referenceFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.reference || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    if (this.walletFilter) {
      list = list.filter(t => this.walletIdOf(t.sourceWallet) === this.walletFilter);
    }

    this.filteredLoans = list;
    if (resetPage) this.page = 0;
    this.paginate();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.referenceFilter = '';
    this.walletFilter = null;
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
    this.totalPages = Math.max(1, Math.ceil(this.filteredLoans.length / this.size));
    if (this.page > this.totalPages - 1) this.page = this.totalPages - 1;
    const start = this.page * this.size;
    this.loans = this.filteredLoans.slice(start, start + this.size);
    this.cdr.markForCheck();
  }

  walletIdOf(w: any): number | null {
    return w?.walletId ?? null;
  }

  walletLabel(walletId: number | null | undefined): string {
    if (!walletId) return '—';
    const wallet = this.wallets.find(w => w.walletId === walletId);
    if (!wallet) return `Wallet #${walletId}`;
    const owner = [wallet.user?.firstName, wallet.user?.lastName].filter(Boolean).join(' ');
    return owner ? `#${wallet.walletId} · ${owner}` : `Wallet #${walletId}`;
  }

  openDetails(loan: TransactionLoan): void {
    this.detailsLoan = loan;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsLoan = null;
    this.cdr.markForCheck();
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase().replace(/_/g, '-')}`;
  }

  trackByLoanId(_index: number, loan: TransactionLoan): number | undefined {
    return loan.transactionId;
  }
}
