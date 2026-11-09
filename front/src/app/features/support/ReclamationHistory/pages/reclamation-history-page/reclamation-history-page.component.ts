import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ReclamationHistoryVm } from '../../vm/reclamation-history.vm';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { ReclamationHistory } from '../../models/reclamation-history.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent],
  templateUrl: './reclamation-history-page.component.html',
  styleUrl: './reclamation-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReclamationHistoryPageComponent implements OnInit {
  private readonly vm = inject(ReclamationHistoryVm);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  allHistory: ReclamationHistory[] = [];
  history: ReclamationHistory[] = [];
  loading = false;
  error: string | null = null;

  reclamationId: number | null = null;
  searchFilter = '';

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('reclamationId');
    if (param) {
      const id = Number(param);
      if (!Number.isNaN(id) && id > 0) {
        this.reclamationId = id;
        this.loadHistory();
      }
    }
  }

  get latestChange(): ReclamationHistory | null {
    return this.allHistory[0] ?? null;
  }

  loadHistory(): void {
    if (!this.reclamationId) {
      this.error = 'Please enter a reclamation ID.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.getByReclamation(this.reclamationId)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.allHistory = [...(data ?? [])].sort((a, b) => {
            const da = a.changedAt ? new Date(a.changedAt).getTime() : 0;
            const db = b.changedAt ? new Date(b.changedAt).getTime() : 0;
            return db - da;
          });
          this.applyFilters();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load history.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    const q = this.searchFilter.trim().toLowerCase();
    this.history = q
      ? this.allHistory.filter(h =>
          (h.note || '').toLowerCase().includes(q) ||
          (h.oldStatus || '').toLowerCase().includes(q) ||
          (h.newStatus || '').toLowerCase().includes(q))
      : [...this.allHistory];
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.searchFilter = '';
    this.applyFilters();
  }

  getStatusClass(status?: string | null): string {
    return `status--${(status || 'unknown').toLowerCase().replace(/_/g, '-')}`;
  }

  trackByHistoryId(_index: number, h: ReclamationHistory): number | undefined {
    return h.historyId;
  }
}
