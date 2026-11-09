export interface ReclamationAttachment {
  attachmentId?: number;
  reclamationId?: number;
  fileName: string;
  fileUrl: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedByUserId?: number;
  uploadedAt?: string;
}