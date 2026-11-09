import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import {
  Reclamation,
  ReclamationCategory,
  ReclamationCreateRequest,
  ReclamationDashboard,
  ReclamationStatus,
  PageResponse
} from '../models/reclamation.model';

export interface ReclamationFilters {
  status?: ReclamationStatus | '';
  category?: ReclamationCategory | '';
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class ReclamationApi {
  constructor(private readonly http: HttpClient) {}

  private buildParams(page: number, size: number, filters: ReclamationFilters = {}): HttpParams {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.q && filters.q.trim()) params = params.set('q', filters.q.trim());
    return params;
  }

  getAll(page = 0, size = 10, filters: ReclamationFilters = {}): Observable<PageResponse<Reclamation>> {
    return this.http.get<PageResponse<Reclamation>>(`${API_BASE_URL}/api/reclamations`, {
      params: this.buildParams(page, size, filters)
    });
  }

  getByUser(userId: number, page = 0, size = 10, filters: ReclamationFilters = {}): Observable<PageResponse<Reclamation>> {
    return this.http.get<PageResponse<Reclamation>>(`${API_BASE_URL}/api/reclamations/by-user/${userId}`, {
      params: this.buildParams(page, size, filters)
    });
  }

  getDashboard(): Observable<ReclamationDashboard> {
    return this.http.get<ReclamationDashboard>(`${API_BASE_URL}/api/reclamations/dashboard`);
  }

  findById(id: number): Observable<Reclamation> {
    return this.http.get<Reclamation>(`${API_BASE_URL}/api/reclamations/${id}`);
  }

  create(payload: ReclamationCreateRequest): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${API_BASE_URL}/api/reclamations`, payload);
  }

  update(id: number, payload: any): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${API_BASE_URL}/api/reclamations/${id}`, payload);
  }

  updateStatus(id: number, status: ReclamationStatus): Observable<Reclamation> {
    return this.http.patch<Reclamation>(`${API_BASE_URL}/api/reclamations/${id}/status`, { status });
  }

  assign(id: number, assignedTo: number): Observable<Reclamation> {
    return this.http.patch<Reclamation>(`${API_BASE_URL}/api/reclamations/${id}/assign`, { assignedTo });
  }
}
