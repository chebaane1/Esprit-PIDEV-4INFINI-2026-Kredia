import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { Transaction, TransactionStatus } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionApi {
  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${API_BASE_URL}/api/transactions`);
  }

  findMine(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${API_BASE_URL}/api/transactions/me`);
  }

  findById(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${API_BASE_URL}/api/transactions/${id}`);
  }

  create(payload: Transaction): Observable<Transaction> {
    return this.http.post<Transaction>(`${API_BASE_URL}/api/transactions`, payload);
  }

  update(id: number, payload: Transaction): Observable<Transaction> {
    return this.http.put<Transaction>(`${API_BASE_URL}/api/transactions/${id}`, payload);
  }

  updateStatus(id: number, status: TransactionStatus): Observable<Transaction> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<Transaction>(`${API_BASE_URL}/api/transactions/${id}/status`, null, { params });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/api/transactions/${id}`);
  }
}