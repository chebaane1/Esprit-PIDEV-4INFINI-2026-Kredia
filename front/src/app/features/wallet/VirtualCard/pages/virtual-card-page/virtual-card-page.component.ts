import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { VirtualCardVm } from '../../vm/virtual-card.vm';
import { VirtualCard } from '../../models/virtual-card.model';
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
  templateUrl: './virtual-card-page.component.html',
  styleUrl: './virtual-card-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualCardPageComponent implements OnInit {
  private readonly vm = inject(VirtualCardVm);
  private readonly walletVm = inject(WalletVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  allCards: VirtualCard[] = [];
  filteredCards: VirtualCard[] = [];
  cards: VirtualCard[] = [];
  wallets: Wallet[] = [];

  loading = false;
  generating = false;
  error: string | null = null;

  walletId: number | null = null;
  page = 0;
  size = 10;
  totalPages = 0;

  statusFilter = '';
  searchFilter = '';

  detailsCard: VirtualCard | null = null;
  revealNumber = false;

  get isClient(): boolean {
    return this.auth.isClient();
  }

  get isAgent(): boolean {
    return this.auth.isAgent();
  }

  get activeCount(): number {
    return this.filteredCards.filter(c => (c.status || '').toUpperCase() === 'ACTIVE').length;
  }

  get blockedCount(): number {
    return this.filteredCards.filter(c => (c.status || '').toUpperCase() === 'BLOCKED').length;
  }

  ngOnInit(): void {
    if (this.auth.isClient()) {
      this.walletVm.findMine().subscribe({
        next: (wallets) => {
          this.wallets = wallets ?? [];
          const wallet = wallets?.[0];
          if (wallet?.walletId) {
            this.walletId = wallet.walletId;
            this.loadCards();
          }
          this.cdr.markForCheck();
        }
      });
    } else {
      this.walletVm.findAll().subscribe({
        next: (wallets) => {
          this.wallets = wallets ?? [];
          if (this.wallets.length && !this.walletId) {
            this.walletId = this.wallets[0].walletId ?? null;
          }
          if (this.walletId) this.loadCards();
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Unable to load wallets.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  get selectedWallet(): Wallet | null {
    return this.wallets.find(w => w.walletId === this.walletId) ?? null;
  }

  walletLabel(wallet: Wallet): string {
    const owner = [wallet.user?.firstName, wallet.user?.lastName].filter(Boolean).join(' ');
    return owner ? `#${wallet.walletId} · ${owner}` : `Wallet #${wallet.walletId}`;
  }

  onWalletChange(): void {
    this.allCards = [];
    this.applyFilters();
    if (this.walletId) this.loadCards();
  }

  loadCards(): void {
    if (!this.walletId) {
      this.error = 'Please select a wallet.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.listByWallet(this.walletId)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.allCards = data ?? [];
          this.applyFilters(false);
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load virtual cards.';
          this.cdr.markForCheck();
        }
      });
  }

  async generateCard(): Promise<void> {
    if (!this.walletId) {
      this.error = 'Please select a wallet.';
      this.cdr.markForCheck();
      return;
    }

    const ok = await this.confirm.confirm({
      title: 'Generate virtual card',
      message: `Generate a new virtual card for wallet #${this.walletId}?`,
      confirmLabel: 'Generate',
    });
    if (!ok) return;

    this.generating = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.generate(this.walletId)
      .pipe(finalize(() => { this.generating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.toast.success('Virtual card generated.');
          this.loadCards();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to generate virtual card.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(resetPage = true): void {
    let list = [...this.allCards];

    if (this.statusFilter) {
      list = list.filter(c => (c.status || '').toUpperCase() === this.statusFilter);
    }

    const q = this.searchFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        (c.cardNumber || '').toLowerCase().includes(q) ||
        (c.provider || '').toLowerCase().includes(q)
      );
    }

    this.filteredCards = list;
    if (resetPage) this.page = 0;
    this.paginate();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.searchFilter = '';
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
    this.totalPages = Math.max(1, Math.ceil(this.filteredCards.length / this.size));
    if (this.page > this.totalPages - 1) this.page = this.totalPages - 1;
    const start = this.page * this.size;
    this.cards = this.filteredCards.slice(start, start + this.size);
    this.cdr.markForCheck();
  }

  openDetails(card: VirtualCard): void {
    this.detailsCard = card;
    this.revealNumber = false;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsCard = null;
    this.revealNumber = false;
    this.cdr.markForCheck();
  }

  toggleReveal(): void {
    this.revealNumber = !this.revealNumber;
    this.cdr.markForCheck();
  }

  maskCard(number: string): string {
    if (!number) return '—';
    return '**** **** **** ' + number.slice(-4);
  }

  formatCard(number: string): string {
    if (!number) return '—';
    return number.replace(/(.{4})/g, '$1 ').trim();
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase()}`;
  }

  trackByCardId(_index: number, card: VirtualCard): number | undefined {
    return card.id;
  }
}
