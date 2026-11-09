import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransactionLoanApi } from '../data-access/transaction-loan.api';
import { TransactionLoan } from '../models/transaction-loan.model';

@Injectable({ providedIn: 'root' })
export class TransactionLoanVm {
  private readonly api = inject(TransactionLoanApi);

  findAll(): Observable<TransactionLoan[]> {
    return this.api.findAll();
  }
}