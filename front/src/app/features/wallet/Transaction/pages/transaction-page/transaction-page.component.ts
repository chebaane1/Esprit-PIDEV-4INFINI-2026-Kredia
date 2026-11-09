import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { TransactionVm } from '../../vm/transaction.vm';
import { EcheanceApi } from '../../data-access/echeance.api';
import { Transaction, TransactionStatus } from '../../models/transaction.model';
import { WalletVm } from '../../../Wallet/vm/wallet.vm';
import { Wallet } from '../../../Wallet/models/wallet.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmService } from '../../../../../shared/ui/confirm-dialog/confirm.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './transaction-page.component.html',
  styleUrl: './transaction-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionPageComponent implements OnInit {
  private readonly vm = inject(TransactionVm);
  private readonly echeanceApi = inject(EcheanceApi);
  private readonly walletVm = inject(WalletVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  transactions: Transaction[] = [];
  wallets: Wallet[] = [];

  loading = false;
  error: string | null = null;
  success: string | null = null;

  showCreate = false;
  creating = false;

  detailsTransaction: Transaction | null = null;

  page = 0;
  size = 10;
  totalPages = 0;

  statusFilter: TransactionStatus | '' = '';
  referenceFilter = '';
  sourceWalletFilter: number | null = null;
  destinationWalletFilter: number | null = null;
  amountMin: number | null = null;
  amountMax: number | null = null;

  form = {
    sourceWalletId: null as number | null,
    destinationWalletId: null as number | null,
    amount: null as number | null,
    description: '',
    reference: '',
    status: 'PENDING' as TransactionStatus,
  };

  payForm = {
    echeanceId: null as number | null,
    amount: null as number | null,
  };
  showPay = false;
  paying = false;

  statuses: TransactionStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'SUSPECTED_FRAUD'];

  get isClient(): boolean {
    return this.auth.isClient();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get totalAmount(): number {
    return this.filteredTransactions.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  }

  get completedCount(): number {
    return this.filteredTransactions.filter(t => t.status === 'COMPLETED').length;
  }

  get pendingCount(): number {
    return this.filteredTransactions.filter(t => t.status === 'PENDING').length;
  }

  ngOnInit(): void {
    this.loadWallets();
    this.loadTransactions();
  }

  loadWallets(): void {
    const request$ = this.isClient ? this.walletVm.findMine() : this.walletVm.findAll();
    request$.subscribe({
      next: (wallets) => {
        this.wallets = wallets ?? [];
        if (this.isClient && wallets?.length && !this.form.sourceWalletId) {
          this.form.sourceWalletId = wallets[0].walletId ?? null;
        }
        this.cdr.markForCheck();
      },
      error: () => { /* wallet list is optional for the page */ }
    });
  }

  loadTransactions(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const request$ = this.isClient ? this.vm.findMine() : this.vm.findAll();

    request$
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.allTransactions = [...(data ?? [])].sort((a, b) => {
            const da = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
            const db = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
            return db - da;
          });
          this.applyFilters(false);
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load transactions.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(resetPage = true): void {
    let list = [...this.allTransactions];

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

    if (this.sourceWalletFilter) {
      list = list.filter(t => this.walletIdOf(t.sourceWallet) === this.sourceWalletFilter);
    }
    if (this.destinationWalletFilter) {
      list = list.filter(t => this.walletIdOf(t.destinationWallet) === this.destinationWalletFilter);
    }
    if (this.amountMin != null) {
      list = list.filter(t => Number(t.amount) >= this.amountMin!);
    }
    if (this.amountMax != null) {
      list = list.filter(t => Number(t.amount) <= this.amountMax!);
    }

    this.filteredTransactions = list;
    if (resetPage) this.page = 0;
    this.paginate();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.referenceFilter = '';
    this.sourceWalletFilter = null;
    this.destinationWalletFilter = null;
    this.amountMin = null;
    this.amountMax = null;
    this.page = 0;
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
    this.totalPages = Math.max(1, Math.ceil(this.filteredTransactions.length / this.size));
    if (this.page > this.totalPages - 1) this.page = this.totalPages - 1;
    const start = this.page * this.size;
    this.transactions = this.filteredTransactions.slice(start, start + this.size);
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

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
    if (!this.showCreate) this.resetCreateForm();
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
  }

  private resetCreateForm(): void {
    this.form = {
      sourceWalletId: this.isClient ? (this.wallets[0]?.walletId ?? null) : null,
      destinationWalletId: null,
      amount: null,
      description: '',
      reference: '',
      status: 'PENDING',
    };
  }

  async create(): Promise<void> {
    if (!this.form.sourceWalletId || !this.form.amount || this.form.amount <= 0) {
      this.error = 'Source wallet and a positive amount are required.';
      this.cdr.markForCheck();
      return;
    }

    const ok = await this.confirm.confirm({
      title: 'Create transaction',
      message: `Create a transaction of ${this.form.amount.toFixed(2)} from wallet #${this.form.sourceWalletId}?`,
      confirmLabel: 'Create',
    });
    if (!ok) return;

    this.creating = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    const payload = {
      sourceWallet: { walletId: this.form.sourceWalletId },
      destinationWallet: this.form.destinationWalletId ? { walletId: this.form.destinationWalletId } : null,
      amount: this.form.amount,
      description: this.form.description || undefined,
      reference: this.form.reference || undefined,
      status: this.isClient ? 'PENDING' as TransactionStatus : this.form.status,
    } as Transaction;

    this.vm.create(payload)
      .pipe(finalize(() => { this.creating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Transaction created.';
          this.toast.success('Transaction created.');
          this.showCreate = false;
          this.resetCreateForm();
          this.loadTransactions();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to create transaction.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  togglePay(): void {
    this.showPay = !this.showPay;
    if (!this.showPay) this.payForm = { echeanceId: null, amount: null };
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
  }

  async payEcheance(): Promise<void> {
    if (!this.payForm.echeanceId || !this.payForm.amount || this.payForm.amount <= 0) {
      this.error = 'Echeance ID and a positive amount are required.';
      this.cdr.markForCheck();
      return;
    }

    const ok = await this.confirm.confirm({
      title: 'Pay installment',
      message: `Pay ${this.payForm.amount.toFixed(2)} for echeance #${this.payForm.echeanceId}?`,
      confirmLabel: 'Pay',
    });
    if (!ok) return;

    this.paying = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.echeanceApi.pay(this.payForm.echeanceId, this.payForm.amount)
      .pipe(finalize(() => { this.paying = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Echeance paid.';
          this.toast.success('Echeance paid.');
          this.showPay = false;
          this.payForm = { echeanceId: null, amount: null };
          this.loadTransactions();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to pay echeance.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  async updateStatus(t: Transaction, status: TransactionStatus, select?: HTMLSelectElement): Promise<void> {
    if (!t.transactionId || t.status === status) return;

    const ok = await this.confirm.confirm({
      title: 'Change transaction status',
      message: `Set transaction #${t.transactionId} status to ${status}?`,
      confirmLabel: 'Update',
      danger: status === 'FAILED' || status === 'REVERSED' || status === 'SUSPECTED_FRAUD',
    });
    if (!ok) {
      if (select) select.value = t.status ?? '';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.vm.updateStatus(t.transactionId, status)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Status updated.';
          this.toast.success('Transaction status updated.');
          this.loadTransactions();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to update status.';
          this.error = msg;
          this.toast.error(msg);
          if (select) select.value = t.status ?? '';
          this.cdr.markForCheck();
        }
      });
  }

  async delete(t: Transaction): Promise<void> {
    if (!t.transactionId) return;

    const ok = await this.confirm.confirm({
      title: 'Delete transaction',
      message: `Delete transaction #${t.transactionId}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.vm.delete(t.transactionId)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Transaction deleted.';
          this.toast.success('Transaction deleted.');
          this.allTransactions = this.allTransactions.filter(x => x.transactionId !== t.transactionId);
          this.applyFilters(false);
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to delete transaction.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  openDetails(t: Transaction): void {
    this.detailsTransaction = t;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsTransaction = null;
    this.cdr.markForCheck();
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase().replace(/_/g, '-')}`;
  }

  trackByTransactionId(_index: number, t: Transaction): number | undefined {
    return t.transactionId;
  }
}
