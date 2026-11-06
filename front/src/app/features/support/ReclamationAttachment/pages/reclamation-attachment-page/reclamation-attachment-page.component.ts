import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ReclamationAttachmentVm } from '../../vm/reclamation-attachment.vm';
import { ToastService } from '../../../../../core/services/toast.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';
import { ReclamationAttachment } from '../../models/reclamation-attachment.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './reclamation-attachment-page.component.html',
  styleUrl: './reclamation-attachment-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReclamationAttachmentPageComponent implements OnInit {
  private readonly vm = inject(ReclamationAttachmentVm);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  allAttachments: ReclamationAttachment[] = [];
  filteredAttachments: ReclamationAttachment[] = [];
  attachments: ReclamationAttachment[] = [];
  loading = false;
  uploading = false;
  error: string | null = null;

  reclamationId: number | null = null;
  selectedFile: File | null = null;
  searchFilter = '';

  page = 0;
  size = 10;
  totalPages = 0;

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('reclamationId');
    if (param) {
      const id = Number(param);
      if (!Number.isNaN(id) && id > 0) {
        this.reclamationId = id;
        this.loadAttachments();
      }
    }
  }

  get totalSize(): number {
    return this.filteredAttachments.reduce((sum, a) => sum + Number(a.sizeBytes ?? 0), 0);
  }

  loadAttachments(): void {
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
          this.allAttachments = [...(data ?? [])].sort((a, b) => {
            const da = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
            const db = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
            return db - da;
          });
          this.applyFilters(false);
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load attachments.';
          this.cdr.markForCheck();
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.cdr.markForCheck();
  }

  clearFile(input?: HTMLInputElement): void {
    this.selectedFile = null;
    if (input) input.value = '';
    this.cdr.markForCheck();
  }

  upload(): void {
    if (!this.reclamationId || !this.selectedFile) {
      this.error = 'Reclamation and file are required.';
      this.cdr.markForCheck();
      return;
    }

    this.uploading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.upload(this.reclamationId, this.selectedFile)
      .pipe(finalize(() => { this.uploading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.toast.success('Attachment uploaded.');
          this.selectedFile = null;
          this.loadAttachments();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to upload attachment.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(resetPage = true): void {
    const q = this.searchFilter.trim().toLowerCase();
    this.filteredAttachments = q
      ? this.allAttachments.filter(a =>
          (a.fileName || '').toLowerCase().includes(q) ||
          (a.contentType || '').toLowerCase().includes(q))
      : [...this.allAttachments];
    if (resetPage) this.page = 0;
    this.paginate();
  }

  resetFilters(): void {
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
    this.totalPages = Math.max(1, Math.ceil(this.filteredAttachments.length / this.size));
    if (this.page > this.totalPages - 1) this.page = this.totalPages - 1;
    const start = this.page * this.size;
    this.attachments = this.filteredAttachments.slice(start, start + this.size);
    this.cdr.markForCheck();
  }

  formatSize(bytes?: number | null): string {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isImage(contentType?: string): boolean {
    return !!contentType && contentType.startsWith('image/');
  }

  trackByAttachmentId(_index: number, a: ReclamationAttachment): number | undefined {
    return a.attachmentId;
  }
}
