import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { AuthService } from '../../../../core/services/auth.service';
import { ReclamationAttachment } from '../models/reclamation-attachment.model';

@Injectable({ providedIn: 'root' })
export class ReclamationAttachmentApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private actorId(): number | null {
    return this.auth.getCurrentUserId();
  }

  getByReclamation(reclamationId: number): Observable<ReclamationAttachment[]> {
    return this.http.get<ReclamationAttachment[]>(
      `${API_BASE_URL}/api/reclamations/${reclamationId}/attachments`
    );
  }

  upload(reclamationId: number, file: File): Observable<ReclamationAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const userId = this.actorId();
    const params = userId ? `?uploadedByUserId=${userId}` : '';
    return this.http.post<ReclamationAttachment>(
      `${API_BASE_URL}/api/reclamations/${reclamationId}/attachments${params}`,
      formData
    );
  }
}