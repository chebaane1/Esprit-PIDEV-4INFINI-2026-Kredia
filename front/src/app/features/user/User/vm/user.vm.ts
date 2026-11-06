import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserApi } from '../data-access/user.api';
import {
  User,
  UserRequest,
  UserRole,
  UserStatus,
  ApiResponse,
  PageResponse
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserVm {
  private readonly api = inject(UserApi);

  search(params: {
    email?: string;
    status?: UserStatus;
    role?: UserRole;
    page?: number;
    size?: number;
  } = {}): Observable<ApiResponse<PageResponse<User>>> {
    return this.api.search(params);
  }

  findById(id: number): Observable<ApiResponse<User>> {
    return this.api.findById(id);
  }

  create(payload: UserRequest): Observable<ApiResponse<User>> {
    return this.api.create(payload);
  }

  update(id: number, payload: UserRequest): Observable<ApiResponse<User>> {
    return this.api.update(id, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(id);
  }

  restore(id: number): Observable<ApiResponse<User>> {
    return this.api.restore(id);
  }

  block(id: number): Observable<ApiResponse<User>> {
    return this.api.block(id);
  }

  suspend(id: number): Observable<ApiResponse<User>> {
    return this.api.suspend(id);
  }

  activate(id: number): Observable<ApiResponse<User>> {
    return this.api.activate(id);
  }

  deactivate(id: number): Observable<ApiResponse<User>> {
    return this.api.deactivate(id);
  }

  changeRole(id: number, role: UserRole): Observable<ApiResponse<User>> {
    return this.api.changeRole(id, role);
  }
}