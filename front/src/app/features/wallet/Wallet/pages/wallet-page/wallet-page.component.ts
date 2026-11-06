import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { WalletVm } from '../../vm/wallet.vm';
import { Wallet, WalletStatus } from '../../models/wallet.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmService } from '../../../../../shared/ui/confirm-dialog/confirm.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './wallet-page.component.html',
  styleUrl: './wallet-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletPageComponent implements OnInit {
  private readonly vm = inject(WalletVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  wallets: Wallet[] = [];
  filteredWallets: Wallet[] = [];
  paginatedWallets: Wallet[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  search = '';
  statusFilter: WalletStatus | '' = '';

  page = 0;
  size = 10;
  totalPages = 0;

  showCreate = false;
  creating = false;
  createUserId: number | null = null;

  detailsWallet: Wallet | null = null;

  txWallet: Wallet | null = null;
  txMode: 'deposit' | 'withdraw' = 'deposit';
  txAmount: number | null = null;
  txLoading = false;

  ngOnInit(): void {
    this.loadWallets();
  }

  get isClient(): boolean {
    return this.auth.isClient();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get isAgent(): boolean {
    return this.auth.isAgent();
  }

  get totalBalance(): number {
    return this.wallets.reduce((sum, w) => sum + Number(w.balance ?? 0), 0);
  }

  get totalFrozen(): number {
    return this.wallets.reduce((sum, w) => sum + Number(w.frozenBalance ?? 0), 0);
  }

  loadWallets(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const request$ = this.isClient ? this.vm.findMine() : this.vm.findAll();

    request$
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.wallets = (data ?? []).map(w => ({
            ...w,
            userId: w.userId ?? w.user?.userId,
          }));
          this.applyFilters();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load wallets.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filteredWallets = this.wallets.filter(w => {
      const matchesStatus = !this.statusFilter || w.status === this.statusFilter;
      const matchesSearch = !q
        || String(w.walletId ?? '').includes(q)
        || String(w.userId ?? '').includes(q)
        || (w.user?.email ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
    this.page = 0;
    this.paginate();
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
    this.totalPages = Math.max(1, Math.ceil(this.filteredWallets.length / this.size));
    if (this.page > this.totalPages - 1) this.page = this.totalPages - 1;
    const start = this.page * this.size;
    this.paginatedWallets = this.filteredWallets.slice(start, start + this.size);
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
    if (!this.showCreate) this.createUserId = null;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
  }

  createWallet(): void {
    if (!this.createUserId) {
      this.error = 'User ID is required.';
      this.cdr.markForCheck();
      return;
    }

    this.creating = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.vm.create(this.createUserId)
      .pipe(finalize(() => { this.creating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Wallet created.';
          this.toast.success('Wallet created.');
          this.showCreate = false;
          this.createUserId = null;
          this.loadWallets();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to create wallet.';
          this.cdr.markForCheck();
        }
      });
  }

  openDetails(wallet: Wallet): void {
    this.detailsWallet = wallet;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsWallet = null;
    this.cdr.markForCheck();
  }

  openTransaction(wallet: Wallet, mode: 'deposit' | 'withdraw'): void {
    this.txWallet = wallet;
    this.txMode = mode;
    this.txAmount = null;
    this.cdr.markForCheck();
  }

  closeTransaction(): void {
    this.txWallet = null;
    this.txAmount = null;
    this.cdr.markForCheck();
  }

  async submitTransaction(): Promise<void> {
    if (!this.txWallet?.walletId) return;
    if (!this.txAmount || this.txAmount <= 0) {
      this.error = 'Amount must be greater than zero.';
      this.cdr.markForCheck();
      return;
    }

    const action = this.txMode === 'deposit' ? 'Deposit' : 'Withdraw';
    const ok = await this.confirm.confirm({
      title: `${action} funds`,
      message: `${action} ${this.txAmount.toFixed(2)} on wallet #${this.txWallet.walletId}?`,
      confirmLabel: action,
      danger: this.txMode === 'withdraw',
    });
    if (!ok) return;

    this.txLoading = true;
    this.error = null;
    this.cdr.markForCheck();

    const request$ = this.txMode === 'deposit'
      ? this.vm.deposit(this.txWallet.walletId, this.txAmount)
      : this.vm.withdraw(this.txWallet.walletId, this.txAmount);

    request$
      .pipe(finalize(() => { this.txLoading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (updated) => {
          const msg = `${action} completed.`;
          this.success = msg;
          this.toast.success(msg);
          this.wallets = this.wallets.map(w => w.walletId === updated.walletId
            ? { ...updated, userId: updated.userId ?? updated.user?.userId }
            : w);
          this.applyFilters();
          this.closeTransaction();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? `${action} failed.`;
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  async toggleFreeze(wallet: Wallet): Promise<void> {
    if (!wallet.walletId) return;
    const freezing = wallet.status !== 'FROZEN';

    const ok = await this.confirm.confirm({
      title: freezing ? 'Freeze wallet' : 'Unfreeze wallet',
      message: `${freezing ? 'Freeze' : 'Unfreeze'} wallet #${wallet.walletId}?`,
      confirmLabel: freezing ? 'Freeze' : 'Unfreeze',
      danger: freezing,
    });
    if (!ok) return;

    const request$ = freezing ? this.vm.freeze(wallet.walletId) : this.vm.unfreeze(wallet.walletId);
    request$.subscribe({
      next: (updated) => {
        const msg = freezing ? 'Wallet frozen.' : 'Wallet unfrozen.';
        this.success = msg;
        this.toast.success(msg);
        this.wallets = this.wallets.map(w => w.walletId === wallet.walletId
          ? { ...updated, userId: updated.userId ?? updated.user?.userId }
          : w);
        this.applyFilters();
      },
      error: () => {
        const msg = `Failed to ${freezing ? 'freeze' : 'unfreeze'} wallet #${wallet.walletId}.`;
        this.error = msg;
        this.toast.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase()}`;
  }

  trackByWalletId(_index: number, wallet: Wallet): number | undefined {
    return wallet.walletId;
  }
}
