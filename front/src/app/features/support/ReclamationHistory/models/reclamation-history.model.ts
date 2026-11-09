export interface ReclamationHistory {
  historyId?: number;
  reclamationId?: number;
  actorUserId?: number;
  oldStatus?: string;
  newStatus?: string;
  note?: string;
  changedAt?: string;
}