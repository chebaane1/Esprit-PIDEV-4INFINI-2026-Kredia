export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'
  | 'SUSPECTED_FRAUD';

export interface WalletRef {
  walletId: number;
}

export interface TransactionLoan {
  transactionId?: number;
  sourceWallet?: WalletRef | { walletId: number } | null;
  destinationWallet?: WalletRef | { walletId: number } | null;
  amount: number;
  status?: TransactionStatus;
  reference?: string;
  description?: string;
  transactionDate?: string;
  dtype?: string;
  echeanceId?: number;
}