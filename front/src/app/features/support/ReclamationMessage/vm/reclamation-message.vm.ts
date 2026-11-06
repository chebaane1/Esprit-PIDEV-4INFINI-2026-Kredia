import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReclamationMessageApi } from '../data-access/reclamation-message.api';
import { ReclamationMessage, ReclamationMessageCreateRequest } from '../models/reclamation-message.model';

@Injectable({ providedIn: 'root' })
export class ReclamationMessageVm {
  private readonly api = inject(ReclamationMessageApi);

  getByReclamation(reclamationId: number, includeInternal = false): Observable<ReclamationMessage[]> {
    return this.api.getByReclamation(reclamationId, includeInternal);
  }

  send(reclamationId: number, payload: ReclamationMessageCreateRequest): Observable<ReclamationMessage> {
    return this.api.send(reclamationId, payload);
  }
}