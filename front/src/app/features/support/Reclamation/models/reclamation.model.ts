export type ReclamationStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'ESCALATED'
  | 'REOPENED'
  | 'RESOLVED'
  | 'REJECTED';

export type ReclamationCategory =
  | 'PAYMENT'
  | 'CREDIT'
  | 'KYC'
  | 'FRAUD'
  | 'ACCOUNT'
  | 'TECHNICAL_SUPPORT'
  | 'OTHER';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ReclamationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Reclamation {
  reclamationId?: number;
  userId: number;
  assignedTo?: number;
  subject: string;
  description: string;
  status?: ReclamationStatus;
  priority?: Priority;
  category?: ReclamationCategory;
  duplicateCount?: number;
  riskScore?: number;
  riskLevel?: ReclamationRiskLevel;
  createdAt?: string;
  lastActivityAt?: string;
  firstResponseAt?: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  resolvedAt?: string;
  customerSatisfactionScore?: number;
  customerFeedback?: string;
  slaBreached?: boolean;
}

export interface ReclamationCreateRequest {
  userId: number;
  subject: string;
  description: string;
  priority?: Priority;
  category?: ReclamationCategory;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface ReclamationCategoryStat {
  category: ReclamationCategory;
  count: number;
}

export interface ReclamationDashboard {
  totalReclamations: number;
  openReclamations: number;
  inProgressReclamations: number;
  waitingCustomerReclamations: number;
  escalatedReclamations: number;
  resolvedReclamations: number;
  rejectedReclamations: number;
  overdueFirstResponses: number;
  overdueResolutions: number;
  averageResolutionHours: number;
  averageCustomerSatisfaction: number;
  resolutionRate: number;
  categoryBreakdown: ReclamationCategoryStat[];
}