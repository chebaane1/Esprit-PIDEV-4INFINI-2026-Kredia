import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReclamationHistoryApi } from '../data-access/reclamation-history.api';
import { ReclamationHistory } from '../models/reclamation-history.model';

@Injectable({ providedIn: 'root' })
export class ReclamationHistoryVm {
  private readonly api = inject(ReclamationHistoryApi);

  getByReclamation(reclamationId: number): Observable<ReclamationHistory[]> {
    return this.api.getByReclamation(reclamationId);
  }
}