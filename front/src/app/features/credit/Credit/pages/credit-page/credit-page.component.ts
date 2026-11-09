import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CreditVm } from '../../vm/credit.vm';
import { ApplicationPredictionResponse, DemandeCredit, RepaymentType } from '../../models/credit.model';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  standalone: false,
  templateUrl: './credit-page.component.html',
  styleUrl: './credit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditPageComponent implements OnInit {
  private readonly vm   = inject(CreditVm);
  private readonly cdr  = inject(ChangeDetectorRef);
  private readonly fb   = inject(FormBuilder);
  readonly auth = inject(AuthService);

  submitting = false;
  success: string | null = null;
  error: string | null = null;
  mlPrediction: ApplicationPredictionResponse | null = null;

  readonly repaymentTypes = [
    { value: 'AMORTISSEMENT_CONSTANT' as RepaymentType, label: 'Constant Amortization' },
    { value: 'MENSUALITE_CONSTANTE'   as RepaymentType, label: 'Constant Monthly Payment' },
    { value: 'IN_FINE'                as RepaymentType, label: 'In Fine'                  }
  ];

  readonly form = this.fb.nonNullable.group({
    amount:        [500,                    [Validators.required, Validators.min(500), Validators.max(10000)]],
    termMonths:    [0,                      [Validators.required, Validators.min(1)]],
    startDate:     ['',                     Validators.required],
    repaymentType: ['MENSUALITE_CONSTANTE' as RepaymentType, Validators.required],
    income:        [0,                      [Validators.required, Validators.min(0.01)]],
    dependents:    [0,                      [Validators.required, Validators.min(0)]],
    isFeePaid:     [false]
  });

  get applicationFee(): number {
    return (this.form.get('amount')?.value || 0) * 0.02;
  }

  ngOnInit(): void {
    if (!this.auth.getCurrentUserId()) {
      this.error = 'You must be logged in to submit an application.';
      this.cdr.markForCheck();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Please fill in all required fields.';
      this.cdr.markForCheck();
      return;
    }

    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      this.error = 'Session expired. Please log in again.';
      this.cdr.markForCheck();
      return;
    }

    this.success    = null;
    this.error      = null;
    this.submitting = true;
    this.cdr.markForCheck();

    const raw = this.form.getRawValue();
    
    // Auto-compute end date based on start date and term
    let computedEndDate = '';
    if (raw.startDate && raw.termMonths) {
      const date = new Date(raw.startDate);
      date.setMonth(date.getMonth() + raw.termMonths);
      computedEndDate = date.toISOString().split('T')[0];
    }

    const payload: DemandeCredit = {
      amount:        raw.amount,
      termMonths:    raw.termMonths,
      startDate:     raw.startDate,
      endDate:       computedEndDate,
      repaymentType: raw.repaymentType,
      income:        raw.income,
      dependents:    raw.dependents,
      isFeePaid:     raw.isFeePaid,
      applicationFee: this.applicationFee,
      userId,
      status: 'PENDING'
    };

    this.vm.createDemande(payload)
      .pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res) => {
          this.success = 'Your credit application has been submitted successfully. Our team will review it shortly.';
          this.mlPrediction = res.mlPrediction;
          this.form.reset({ repaymentType: 'MENSUALITE_CONSTANTE' as RepaymentType, dependents: 0, isFeePaid: false });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.name === 'TimeoutError'
            ? 'The server is taking too long to respond. Please check that the backend is running.'
            : (err?.error?.message ?? 'Error submitting the application.');
          this.cdr.markForCheck();
        }
      });
  }
}
