import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api.config';
import { AuthService } from '../../../../core/services/auth.service';
import {
  User,
  UserRequest,
  UserRole,
  UserStatus,
  UserRoleChangeRequest,
  ApiResponse,
  PageResponse
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private actorHeaders(): Record<string, string> {
    const id = this.auth.getCurrentUserId();
    return id ? { 'X-Actor-Id': String(id) } : {};
  }

  search(params: {
    email?: string;
    status?: UserStatus;
    role?: UserRole;
    page?: number;
    size?: number;
  } = {}): Observable<ApiResponse<PageResponse<User>>> {
    let httpParams = new HttpParams();
    if (params.email) httpParams = httpParams.set('email', params.email);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.role) httpParams = httpParams.set('role', params.role);
    httpParams = httpParams.set('page', String(params.page ?? 0));
    httpParams = httpParams.set('size', String(params.size ?? 10));

    return this.http.get<ApiResponse<PageResponse<User>>>(
      `${API_BASE_URL}/api/user`,
      { params: httpParams, headers: this.actorHeaders() }
    );
  }

  findById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}`,
      { headers: this.actorHeaders() }
    );
  }

  create(payload: UserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(
      `${API_BASE_URL}/api/user`,
      payload,
      { headers: this.actorHeaders() }
    );
  }

  update(id: number, payload: UserRequest): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}`,
      payload,
      { headers: this.actorHeaders() }
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${API_BASE_URL}/api/user/${id}`,
      { headers: this.actorHeaders() }
    );
  }

  restore(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}/restore`,
      {},
      { headers: this.actorHeaders() }
    );
  }

  block(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}/block`,
      {},
      { headers: this.actorHeaders() }
    );
  }

  suspend(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}/suspend`,
      {},
      { headers: this.actorHeaders() }
    );
  }

  activate(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}/activate`,
      {},
      { headers: this.actorHeaders() }
    );
  }

  deactivate(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}/deactivate`,
      {},
      { headers: this.actorHeaders() }
    );
  }

  changeRole(id: number, role: UserRole): Observable<ApiResponse<User>> {
    const payload: UserRoleChangeRequest = { role };
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/api/user/${id}/role`,
      payload,
      { headers: this.actorHeaders() }
    );
  }
}