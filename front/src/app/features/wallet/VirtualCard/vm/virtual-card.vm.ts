import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { VirtualCardApi } from '../data-access/virtual-card.api';
import { VirtualCard } from '../models/virtual-card.model';

@Injectable({ providedIn: 'root' })
export class VirtualCardVm {
  private readonly api = inject(VirtualCardApi);

  listByWallet(walletId: number): Observable<VirtualCard[]> {
    return this.api.listByWallet(walletId);
  }

  generate(walletId: number): Observable<VirtualCard> {
    return this.api.generate(walletId);
  }
}