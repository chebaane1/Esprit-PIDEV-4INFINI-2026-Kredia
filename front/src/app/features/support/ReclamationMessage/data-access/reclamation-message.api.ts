import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { ReclamationMessage, ReclamationMessageCreateRequest } from '../models/reclamation-message.model';

@Injectable({ providedIn: 'root' })
export class ReclamationMessageApi {
  constructor(private readonly http: HttpClient) {}

  getByReclamation(reclamationId: number, includeInternal = false): Observable<ReclamationMessage[]> {
    const params = new HttpParams().set('includeInternal', String(includeInternal));
    return this.http.get<ReclamationMessage[]>(
      `${API_BASE_URL}/api/reclamations/${reclamationId}/messages`,
      { params }
    );
  }

  send(reclamationId: number, payload: ReclamationMessageCreateRequest): Observable<ReclamationMessage> {
    return this.http.post<ReclamationMessage>(
      `${API_BASE_URL}/api/reclamations/${reclamationId}/messages`,
      payload
    );
  }
}