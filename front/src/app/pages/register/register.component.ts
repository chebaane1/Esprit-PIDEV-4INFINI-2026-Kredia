import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly zone   = inject(NgZone);

  loading = false;
  error: string | null = null;
  success: string | null = null;

  readonly form = this.fb.nonNullable.group({
    firstName:   ['', [Validators.required]],
    lastName:    ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    email:       ['', [Validators.required, Validators.email]],
    password:    ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error   = null;
    this.success = null;
    this.cdr.markForCheck();

    const payload: RegisterRequest = this.form.getRawValue();

    this.auth.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Account created successfully. You can now sign in.';
        this.cdr.markForCheck();
        this.zone.run(() => setTimeout(() => this.router.navigateByUrl('/login'), 1200));
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.message ??
          err?.error?.error ??
          (err?.status === 0
            ? 'Unable to reach the server.'
            : `Error ${err?.status ?? ''} — please try again.`);
        this.cdr.markForCheck();
      }
    });
  }
}