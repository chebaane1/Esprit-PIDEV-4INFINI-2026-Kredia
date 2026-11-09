export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'
  | 'SUSPECTED_FRAUD';

export interface WalletRef {
  walletId: number;
}

export interface Transaction {
  transactionId?: number;
  sourceWallet: WalletRef | { walletId: number };
  destinationWallet?: WalletRef | { walletId: number } | null;
  amount: number;
  status?: TransactionStatus;
  reference?: string;
  description?: string;
  transactionDate?: string;
  dtype?: string;
}