import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { TransactionLoan } from '../models/transaction-loan.model';

@Injectable({ providedIn: 'root' })
export class TransactionLoanApi {
  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<TransactionLoan[]> {
    return this.http.get<TransactionLoan[]>(`${API_BASE_URL}/api/transactions`);
  }
}