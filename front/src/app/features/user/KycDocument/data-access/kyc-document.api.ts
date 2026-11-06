import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { AuthService } from '../../../../core/services/auth.service';
import { KycDocument, KycStatus, ApiResponse } from '../models/kyc-document.model';

@Injectable({ providedIn: 'root' })
export class KycDocumentApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private actorHeaders(): Record<string, string> {
    const id = this.auth.getCurrentUserId();
    return id ? { 'X-Actor-Id': String(id) } : {};
  }

  getMyDocuments(): Observable<ApiResponse<KycDocument[]>> {
    return this.http.get<ApiResponse<KycDocument[]>>(
      `${API_BASE_URL}/api/user/kyc`,
      { headers: this.actorHeaders() }
    );
  }

  getDocumentsByUser(userId: number): Observable<ApiResponse<KycDocument[]>> {
    return this.http.get<ApiResponse<KycDocument[]>>(
      `${API_BASE_URL}/api/user/kyc/user/${userId}`,
      { headers: this.actorHeaders() }
    );
  }

  upload(file: File, type: string): Observable<ApiResponse<KycDocument>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<ApiResponse<KycDocument>>(
      `${API_BASE_URL}/api/user/kyc/upload`,
      formData,
      { headers: this.actorHeaders() }
    );
  }

  verify(docId: number, status: KycStatus): Observable<ApiResponse<KycDocument>> {
    return this.http.patch<ApiResponse<KycDocument>>(
      `${API_BASE_URL}/api/user/kyc/${docId}/verify?status=${status}`,
      {},
      { headers: this.actorHeaders() }
    );
  }
}