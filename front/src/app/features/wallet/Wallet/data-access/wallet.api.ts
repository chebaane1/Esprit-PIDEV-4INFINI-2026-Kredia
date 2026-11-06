import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { Wallet } from '../models/wallet.model';

@Injectable({ providedIn: 'root' })
export class WalletApi {
  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<Wallet[]> {
    return this.http.get<Wallet[]>(`${API_BASE_URL}/api/wallets`);
  }

  findMine(): Observable<Wallet[]> {
    return this.http.get<Wallet[]>(`${API_BASE_URL}/api/wallets/me`);
  }

  findByUser(userId: number): Observable<Wallet[]> {
    return this.http.get<Wallet[]>(`${API_BASE_URL}/api/wallets/user/${userId}`);
  }

  create(userId: number): Observable<Wallet> {
    return this.http.post<Wallet>(`${API_BASE_URL}/api/wallets`, { user: { userId } });
  }

  freeze(id: number): Observable<Wallet> {
    return this.http.patch<Wallet>(`${API_BASE_URL}/api/wallets/${id}/freeze`, {});
  }

  unfreeze(id: number): Observable<Wallet> {
    return this.http.patch<Wallet>(`${API_BASE_URL}/api/wallets/${id}/unfreeze`, {});
  }

  deposit(id: number, amount: number): Observable<Wallet> {
    return this.http.post<Wallet>(`${API_BASE_URL}/api/wallets/${id}/deposit`, { amount });
  }

  withdraw(id: number, amount: number): Observable<Wallet> {
    return this.http.post<Wallet>(`${API_BASE_URL}/api/wallets/${id}/withdraw`, { amount });
  }
}
