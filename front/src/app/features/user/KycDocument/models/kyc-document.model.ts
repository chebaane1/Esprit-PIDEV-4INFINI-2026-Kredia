export type DocumentType =
  | 'CIN'
  | 'SIGNATURE'
  | 'INCOME_PROOF'
  | 'BANK_STATEMENT'
  | 'TAX_RETURN'
  | 'EMPLOYMENT_CONTRACT';

export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface KycDocument {
  kycId?: number;
  userId?: number;
  documentType: DocumentType;
  filePath: string;
  status: KycStatus;
  createdAt?: string;
  verifiedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}