export interface TransactionAuditLog {
  logId?: number;
  transactionId?: number;
  previousHash?: string;
  dataHash?: string;
  blockchainTxHash?: string;
  createdAt?: string;
}