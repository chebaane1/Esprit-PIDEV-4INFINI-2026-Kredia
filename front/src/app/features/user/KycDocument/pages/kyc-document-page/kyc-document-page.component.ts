import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { KycDocumentVm } from '../../vm/kyc-document.vm';
import { AuthService } from '../../../../../core/services/auth.service';
import { KycDocument, KycStatus, DocumentType } from '../../models/kyc-document.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kyc-document-page.component.html',
  styleUrl: './kyc-document-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KycDocumentPageComponent implements OnInit {
  private readonly vm = inject(KycDocumentVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  documents: KycDocument[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  selectedFile: File | null = null;
  selectedType: DocumentType = 'CIN';
  uploading = false;

  /** Agents/admins can look up any customer's KYC documents by user id. */
  lookupUserId: number | null = null;

  documentTypes: DocumentType[] = [
    'CIN', 'SIGNATURE', 'INCOME_PROOF', 'BANK_STATEMENT', 'TAX_RETURN', 'EMPLOYMENT_CONTRACT'
  ];

  get isClient(): boolean {
    return this.auth.isClient();
  }

  get isAgent(): boolean {
    return this.auth.isAgent();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  ngOnInit(): void {
    if (!this.auth.getCurrentUserId()) {
      this.error = 'You must be logged in.';
      this.cdr.markForCheck();
      return;
    }
    if (this.isClient) {
      this.loadDocuments();
    }
  }

  loadDocuments(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const request$ = this.isClient
      ? this.vm.getMyDocuments()
      : (this.lookupUserId != null ? this.vm.getDocumentsByUser(this.lookupUserId) : null);

    if (!request$) {
      this.documents = [];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    request$
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res) => {
          const docs = res.data as KycDocument[] | null;
          this.documents = (docs ?? []).map(d => ({
            ...d,
            userId: (d as any).user?.id ?? d.userId
          }));
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load documents.';
          this.cdr.markForCheck();
        }
      });
  }

  lookupCustomer(): void {
    if (this.lookupUserId == null) {
      this.error = 'Enter a customer user ID.';
      this.cdr.markForCheck();
      return;
    }
    this.success = null;
    this.loadDocuments();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.cdr.markForCheck();
  }

  upload(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a file.';
      this.cdr.markForCheck();
      return;
    }

    this.uploading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.vm.upload(this.selectedFile, this.selectedType)
      .pipe(finalize(() => { this.uploading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Document uploaded successfully.';
          this.selectedFile = null;
          this.loadDocuments();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to upload document.';
          this.cdr.markForCheck();
        }
      });
  }

  verify(doc: KycDocument, status: KycStatus): void {
    if (!doc.kycId) return;
    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.vm.verify(doc.kycId, status)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = `Document ${status.toLowerCase()}.`;
          this.loadDocuments();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to verify document.';
          this.cdr.markForCheck();
        }
      });
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase()}`;
  }
}