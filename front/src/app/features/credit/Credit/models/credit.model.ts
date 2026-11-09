export type RepaymentType = 'AMORTISSEMENT_CONSTANT' | 'MENSUALITE_CONSTANTE' | 'IN_FINE';
export type CreditStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';

export interface Credit {
  creditId?: number;
  userId?: number;
  amount: number;
  interestRate?: number;
  startDate: string;
  endDate: string;
  termMonths: number;
  repaymentType: RepaymentType;
  status?: CreditStatus;
  income: number;
  dependents: number;
  createdAt?: string;
}

/** Credit application submitted by the client (before approval) */
export interface DemandeCredit {
  creditId?: number;   // mapped from backend @JsonProperty("creditId")
  userId?: number;
  amount: number;
  termMonths: number;
  startDate: string;
  endDate: string;
  repaymentType: RepaymentType;
  income: number;
  dependents: number;
  status?: CreditStatus;
  createdAt?: string;
  applicationFee?: number;
  isFeePaid?: boolean;
}

export interface DefaultPredictionResponse {
  credit_id: number;
  default_probability: number;
  risk_label: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

/** ML prediction at application submission time (status=0/1) */
export interface ApplicationPredictionResponse {
  demande_id: number | null;
  status: 0 | 1;               // 0 = can repay, 1 = default risk
  default_probability: number; // 0.0 → 1.0
  eligibility_score: number;   // 1 - default_probability
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

/** Wrapper returned by POST /api/credits */
export interface CreateDemandeResponse {
  demande: DemandeCredit;
  mlPrediction: ApplicationPredictionResponse | null;
}
