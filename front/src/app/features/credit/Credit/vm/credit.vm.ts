import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreditApi } from '../data-access/credit.api';
import { Credit, DemandeCredit, DefaultPredictionResponse, ApplicationPredictionResponse, CreateDemandeResponse } from '../models/credit.model';

/**
 * VM (Service) — data layer for Credit.
 * Exposes Observables. No UI state.
 */
@Injectable({ providedIn: 'root' })
export class CreditVm {
  private readonly api = inject(CreditApi);

  findAll(): Observable<Credit[]> {
    return this.api.findAll();
  }

  findByUserId(userId: number): Observable<Credit[]> {
    return this.api.findByUserId(userId);
  }

  /** Submit a credit application — returns {demande, mlPrediction} */
  createDemande(demande: DemandeCredit): Observable<CreateDemandeResponse> {
    return this.api.createDemande(demande);
  }

  /** Re-run ML application prediction on an existing demande (admin) */
  predictApplication(demandeId: number): Observable<ApplicationPredictionResponse> {
    return this.api.predictApplication(demandeId);
  }

  /** @deprecated */
  create(credit: Credit): Observable<Credit> {
    return this.api.create(credit);
  }

  /** Pending applications for admin/agent */
  getPendingDemandes(): Observable<DemandeCredit[]> {
    return this.api.getPendingDemandes();
  }

  /** Applications submitted by a client */
  findDemandesByUserId(userId: number): Observable<DemandeCredit[]> {
    return this.api.findDemandesByUserId(userId);
  }

  approveCredit(id: number): Observable<Credit> {
    return this.api.approveCredit(id);
  }

  rejectCredit(id: number): Observable<DemandeCredit> {
    return this.api.rejectCredit(id);
  }

  predictDefault(id: number): Observable<DefaultPredictionResponse> {
    return this.api.predictDefault(id);
  }

  exportExcel(id: number): Observable<Blob> {
    return this.api.exportExcel(id);
  }

  exportPdf(id: number): Observable<Blob> {
    return this.api.exportPdf(id);
  }
}
