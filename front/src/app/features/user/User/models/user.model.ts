export type UserRole = 'ADMIN' | 'CLIENT' | 'AGENT' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface User {
  id?: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  deleted?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
  dateOfBirth?: string;
  address?: string;
  gender?: string;
}

export interface UserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserRoleChangeRequest {
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}