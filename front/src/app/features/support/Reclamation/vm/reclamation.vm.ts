import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReclamationApi, ReclamationFilters } from '../data-access/reclamation.api';
import {
  Reclamation,
  ReclamationCreateRequest,
  ReclamationDashboard,
  ReclamationStatus,
  PageResponse
} from '../models/reclamation.model';

@Injectable({ providedIn: 'root' })
export class ReclamationVm {
  private readonly api = inject(ReclamationApi);

  getAll(page = 0, size = 10, filters: ReclamationFilters = {}): Observable<PageResponse<Reclamation>> {
    return this.api.getAll(page, size, filters);
  }

  getByUser(userId: number, page = 0, size = 10, filters: ReclamationFilters = {}): Observable<PageResponse<Reclamation>> {
    return this.api.getByUser(userId, page, size, filters);
  }

  getDashboard(): Observable<ReclamationDashboard> {
    return this.api.getDashboard();
  }

  findById(id: number): Observable<Reclamation> {
    return this.api.findById(id);
  }

  create(payload: ReclamationCreateRequest): Observable<Reclamation> {
    return this.api.create(payload);
  }

  update(id: number, payload: any): Observable<Reclamation> {
    return this.api.update(id, payload);
  }

  updateStatus(id: number, status: ReclamationStatus): Observable<Reclamation> {
    return this.api.updateStatus(id, status);
  }

  assign(id: number, assignedTo: number): Observable<Reclamation> {
    return this.api.assign(id, assignedTo);
  }
}
