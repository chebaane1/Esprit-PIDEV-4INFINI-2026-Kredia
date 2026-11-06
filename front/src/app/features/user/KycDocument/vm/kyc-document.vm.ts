import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { KycDocumentApi } from '../data-access/kyc-document.api';
import { KycDocument, KycStatus, ApiResponse } from '../models/kyc-document.model';

@Injectable({ providedIn: 'root' })
export class KycDocumentVm {
  private readonly api = inject(KycDocumentApi);

  getMyDocuments(): Observable<ApiResponse<KycDocument[]>> {
    return this.api.getMyDocuments();
  }

  getDocumentsByUser(userId: number): Observable<ApiResponse<KycDocument[]>> {
    return this.api.getDocumentsByUser(userId);
  }

  upload(file: File, type: string): Observable<ApiResponse<KycDocument>> {
    return this.api.upload(file, type);
  }

  verify(docId: number, status: KycStatus): Observable<ApiResponse<KycDocument>> {
    return this.api.verify(docId, status);
  }
}