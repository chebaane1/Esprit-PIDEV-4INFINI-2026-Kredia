import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';

@Injectable({ providedIn: 'root' })
export class EcheanceApi {
  constructor(private readonly http: HttpClient) {}

  pay(echeanceId: number, amount: number): Observable<any> {
    return this.http.put<any>(
      `${API_BASE_URL}/api/echeances/${echeanceId}/pay`,
      { amount }
    );
  }
}