export type MessageVisibility = 'CUSTOMER' | 'INTERNAL';

export interface ReclamationMessage {
  messageId?: number;
  reclamationId?: number;
  authorUserId: number;
  visibility: MessageVisibility;
  message: string;
  createdAt?: string;
}

export interface ReclamationMessageCreateRequest {
  authorUserId: number;
  visibility: MessageVisibility;
  message: string;
}