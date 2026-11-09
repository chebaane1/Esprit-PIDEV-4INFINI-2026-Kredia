export interface VirtualCard {
  id?: number;
  walletId?: number;
  cardNumber: string;
  cvv?: string;
  expiryDate: string;
  provider?: string;
  status: string;
  createdAt?: string;
}