import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransactionApi } from '../data-access/transaction.api';
import { Transaction, TransactionStatus } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionVm {
  private readonly api = inject(TransactionApi);

  findAll(): Observable<Transaction[]> {
    return this.api.findAll();
  }

  findMine(): Observable<Transaction[]> {
    return this.api.findMine();
  }

  findById(id: number): Observable<Transaction> {
    return this.api.findById(id);
  }

  create(payload: Transaction): Observable<Transaction> {
    return this.api.create(payload);
  }

  update(id: number, payload: Transaction): Observable<Transaction> {
    return this.api.update(id, payload);
  }

  updateStatus(id: number, status: TransactionStatus): Observable<Transaction> {
    return this.api.updateStatus(id, status);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }
}