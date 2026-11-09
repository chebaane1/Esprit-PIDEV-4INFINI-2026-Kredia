import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { WalletApi } from '../data-access/wallet.api';
import { Wallet } from '../models/wallet.model';

@Injectable({ providedIn: 'root' })
export class WalletVm {
  private readonly api = inject(WalletApi);

  findAll(): Observable<Wallet[]> {
    return this.api.findAll();
  }

  findMine(): Observable<Wallet[]> {
    return this.api.findMine();
  }

  findByUser(userId: number): Observable<Wallet[]> {
    return this.api.findByUser(userId);
  }

  create(userId: number): Observable<Wallet> {
    return this.api.create(userId);
  }

  freeze(id: number): Observable<Wallet> {
    return this.api.freeze(id);
  }

  unfreeze(id: number): Observable<Wallet> {
    return this.api.unfreeze(id);
  }

  deposit(id: number, amount: number): Observable<Wallet> {
    return this.api.deposit(id, amount);
  }

  withdraw(id: number, amount: number): Observable<Wallet> {
    return this.api.withdraw(id, amount);
  }
}
