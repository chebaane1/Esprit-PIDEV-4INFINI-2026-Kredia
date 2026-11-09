import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { ReclamationHistory } from '../models/reclamation-history.model';

@Injectable({ providedIn: 'root' })
export class ReclamationHistoryApi {
  constructor(private readonly http: HttpClient) {}

  getByReclamation(reclamationId: number): Observable<ReclamationHistory[]> {
    return this.http.get<ReclamationHistory[]>(
      `${API_BASE_URL}/api/reclamations/${reclamationId}/history`
    );
  }
}