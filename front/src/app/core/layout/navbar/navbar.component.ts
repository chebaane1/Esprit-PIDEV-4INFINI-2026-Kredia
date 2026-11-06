import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { DarkModeService } from '../../services/dark-mode.service';
import { AuthService } from '../../services/auth.service';
import { CreditApi } from '../../../features/credit/Credit/data-access/credit.api';
import { KycLoanApi } from '../../../features/credit/KycLoan/data-access/kyc-loan.api';
import { EcheanceApi } from '../../../features/credit/Echeance/data-access/echeance.api';
import { ReclamationApi } from '../../../features/support/Reclamation/data-access/reclamation.api';
import { forkJoin, Subscription, interval, of } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';

export type NotifType = 'CREDIT' | 'KYC' | 'PAYMENT' | 'ECHEANCE' | 'RECLAMATION';

export interface NotifItem {
  type: NotifType;
  id: number;
  relatedId?: number;
  status: string;
  date: Date;
  title: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnInit, OnDestroy {
  darkModeService = inject(DarkModeService);
  auth = inject(AuthService);
  creditApi = inject(CreditApi);
  kycApi = inject(KycLoanApi);
  echeanceApi = inject(EcheanceApi);
  reclamationApi = inject(ReclamationApi);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  recentUpdates: NotifItem[] = [];
  hasUnread = false;
  unreadCount = 0;
  showDropdown = false;
  isSimulateurPage = false;

  @Input() showMenuButton = false;
  @Output() menuToggle = new EventEmitter<void>();

  private seenIds = new Set<string>();
  private sub: Subscription | null = null;

  private getStorageKey(): string {
    const userId = this.auth.getCurrentUserId();
    return `notifSeen_${userId}`;
  }

  private itemKey(item: NotifItem): string {
    return `${item.type}_${item.id}_${item.status}`;
  }

  private loadSeenIds(): void {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      this.seenIds = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      this.seenIds = new Set();
    }
  }

  private saveSeenIds(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify([...this.seenIds]));
    } catch { /* ignore */ }
  }

  ngOnInit() {
    this.updateSimulateurFlag(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.updateSimulateurFlag(e.urlAfterRedirects || e.url);
      this.cdr.markForCheck();
    });

    this.loadSeenIds();
    this.fetchUpdates();
    this.sub = interval(30000).subscribe(() => this.fetchUpdates());
  }

  private updateSimulateurFlag(url: string): void {
    // Show public navbar only when on /simulateur AND not logged in
    this.isSimulateurPage = url.split('?')[0] === '/simulateur' && !this.auth.isLoggedIn();
  }

  goToLanding(): void {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  toggleDarkMode() {
    this.darkModeService.toggleDarkMode();
  }

  fetchUpdates() {
    const userId = this.auth.getCurrentUserId();
    if (!userId) return;

    if (this.auth.isClient()) {
      forkJoin({
        credits: this.creditApi.findDemandesByUserId(userId).pipe(catchError(() => of([]))),
        kycs: this.kycApi.getByUserId(userId).pipe(catchError(() => of([])))
      }).subscribe(({ credits, kycs }) => {
        const updates: NotifItem[] = [];

        credits.forEach(c => {
          if (c.status === 'APPROVED' || c.status === 'REJECTED') {
            updates.push({
              type: 'CREDIT',
              id: c.creditId || 0,
              status: c.status,
              date: c.createdAt ? new Date(c.createdAt) : new Date(),
              title: `Credit Application ${c.status === 'APPROVED' ? 'Approved' : 'Rejected'}`
            });
          }
        });

        kycs.forEach(k => {
          if (k.verifiedStatus === 'APPROVED' || k.verifiedStatus === 'REJECTED') {
            updates.push({
              type: 'KYC',
              id: k.kycLoanId || 0,
              relatedId: k.creditId || k.demandeId || 0,
              status: k.verifiedStatus,
              date: k.submittedAt ? new Date(k.submittedAt) : new Date(),
              title: `KYC Document ${k.verifiedStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`
            });
          }
        });

        updates.sort((a, b) => b.date.getTime() - a.date.getTime());
        this.recentUpdates = updates.slice(0, 10);
        this.checkUnread();
        this.cdr.markForCheck();
      });
    } else {
      // Admin / Agent Logic
      forkJoin({
        credits: this.creditApi.getPendingDemandes().pipe(catchError(() => of([]))),
        kycs: this.kycApi.getAll().pipe(catchError(() => of([]))),
        echeances: this.echeanceApi.getAll().pipe(catchError(() => of([])))
      }).subscribe(({ credits, kycs, echeances }) => {
        const updates: NotifItem[] = [];

        credits.forEach(c => {
          if (c.status === 'PENDING') {
            updates.push({
              type: 'CREDIT',
              id: c.creditId || 0,
              status: c.status,
              date: c.createdAt ? new Date(c.createdAt) : new Date(),
              title: `New Credit Application to Review`
            });
          }
        });

        kycs.forEach(k => {
          if (k.verifiedStatus === 'PENDING') {
            updates.push({
              type: 'KYC',
              id: k.kycLoanId || 0,
              relatedId: k.creditId || k.demandeId || 0,
              status: k.verifiedStatus,
              date: k.submittedAt ? new Date(k.submittedAt) : new Date(),
              title: `New KYC Document Submitted`
            });
          }
        });

        echeances.forEach(e => {
          if (e.echeance.status === 'PAID' || e.echeance.status === 'PARTIALLY_PAID') {
            updates.push({
              type: 'PAYMENT',
              id: e.echeance.echeanceId || 0,
              status: e.echeance.status,
              date: e.echeance.paidAt ? new Date(e.echeance.paidAt) : new Date(),
              title: `Installment Payment Received`
            });
          }
        });

        updates.sort((a, b) => b.date.getTime() - a.date.getTime());
        this.recentUpdates = updates.slice(0, 10);
        this.checkUnread();
        this.cdr.markForCheck();
      });
    }
  }

  checkUnread() {
    this.loadSeenIds();
    const unread = this.recentUpdates.filter(u => !this.seenIds.has(this.itemKey(u)));
    this.unreadCount = unread.length;
    this.hasUnread = this.unreadCount > 0;
  }

  isUnread(item: NotifItem): boolean {
    return !this.seenIds.has(this.itemKey(item));
  }

  toggleNotifications() {
    this.showDropdown = !this.showDropdown;
    this.cdr.markForCheck();
  }

  markOneAsRead(item: NotifItem): void {
    this.seenIds.add(this.itemKey(item));
    this.saveSeenIds();
    const unread = this.recentUpdates.filter(u => !this.seenIds.has(this.itemKey(u)));
    this.unreadCount = unread.length;
    this.hasUnread = this.unreadCount > 0;
  }

  goToTarget(item: NotifItem) {
    this.markOneAsRead(item);
    this.showDropdown = false;
    this.cdr.markForCheck();
    if (item.type === 'CREDIT') {
      this.router.navigate(['/credit/list'], { queryParams: { demandeId: item.id } });
    } else if (item.type === 'KYC') {
      if (!this.auth.isClient() && item.status === 'PENDING') {
        this.router.navigate(['/credit/list'], { queryParams: { openKycDemandeId: item.relatedId, filterKycLoanId: item.id } });
      } else {
        this.router.navigate(['/credit/kyc'], { queryParams: { kycLoanId: item.id } });
      }
    } else {
      this.router.navigate(['/credit/echeances'], { queryParams: { echeanceId: item.id } });
    }
  }
}
