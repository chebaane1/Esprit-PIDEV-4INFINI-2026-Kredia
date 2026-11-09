import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const checkAuth = (): boolean => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

const checkRole = (roles: string[]): boolean => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const role = auth.getCurrentUserRole();
  if (role && roles.includes(role)) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

export const authGuard: CanActivateFn           = () => checkAuth();
export const authChildGuard: CanActivateChildFn = () => checkAuth();
export const adminGuard: CanActivateFn          = () => checkRole(['ADMIN', 'SUPER_ADMIN']);
export const agentGuard: CanActivateFn          = () => checkRole(['AGENT', 'ADMIN', 'SUPER_ADMIN']);
export const clientGuard: CanActivateFn         = () => checkRole(['CLIENT']);
