export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'FROZEN';

export interface WalletUser {
  userId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Wallet {
  walletId?: number;
  userId?: number;
  user?: WalletUser;
  balance: number | string;
  frozenBalance?: number | string;
  status: WalletStatus;
  createdAt?: string;
  updatedAt?: string;
}