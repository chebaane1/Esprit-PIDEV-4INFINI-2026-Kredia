import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { TransactionAuditLog } from '../models/transaction-audit-log.model';

@Injectable({ providedIn: 'root' })
export class TransactionAuditLogApi {
  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<TransactionAuditLog[]> {
    return this.http.get<TransactionAuditLog[]>(`${API_BASE_URL}/api/audit-logs`);
  }

  findByTransaction(transactionId: number): Observable<TransactionAuditLog[]> {
    return this.http.get<TransactionAuditLog[]>(`${API_BASE_URL}/api/audit-logs/transaction/${transactionId}`);
  }
}
