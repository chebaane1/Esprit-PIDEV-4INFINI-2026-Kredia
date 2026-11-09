import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReclamationAttachmentApi } from '../data-access/reclamation-attachment.api';
import { ReclamationAttachment } from '../models/reclamation-attachment.model';

@Injectable({ providedIn: 'root' })
export class ReclamationAttachmentVm {
  private readonly api = inject(ReclamationAttachmentApi);

  getByReclamation(reclamationId: number): Observable<ReclamationAttachment[]> {
    return this.api.getByReclamation(reclamationId);
  }

  upload(reclamationId: number, file: File): Observable<ReclamationAttachment> {
    return this.api.upload(reclamationId, file);
  }
}