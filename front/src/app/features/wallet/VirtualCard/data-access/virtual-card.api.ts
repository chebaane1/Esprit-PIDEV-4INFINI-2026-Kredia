import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { VirtualCard } from '../models/virtual-card.model';

@Injectable({ providedIn: 'root' })
export class VirtualCardApi {
  constructor(private readonly http: HttpClient) {}

  listByWallet(walletId: number): Observable<VirtualCard[]> {
    return this.http.get<VirtualCard[]>(`${API_BASE_URL}/api/wallets/${walletId}/virtual-cards`);
  }

  generate(walletId: number): Observable<VirtualCard> {
    return this.http.post<VirtualCard>(`${API_BASE_URL}/api/wallets/${walletId}/virtual-card`, {});
  }
}