import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UserVm } from '../../vm/user.vm';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmService } from '../../../../../shared/ui/confirm-dialog/confirm.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';
import {
  User,
  UserRequest,
  UserRole,
  UserStatus,
  PageResponse
} from '../../models/user.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageLayoutComponent, PaginationComponent],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPageComponent implements OnInit {
  private readonly vm = inject(UserVm);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  users: User[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  filterEmail = '';
  filterStatus: UserStatus | '' = '';
  filterRole: UserRole | '' = '';

  showCreate = false;
  editId: number | null = null;
  detailsUser: User | null = null;

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENT' as UserRole, [Validators.required]],
    status: ['ACTIVE' as UserStatus, [Validators.required]],
  });

  readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    password: [''],
    role: ['CLIENT' as UserRole, [Validators.required]],
    status: ['ACTIVE' as UserStatus, [Validators.required]],
  });

  ngOnInit(): void {
    if (!this.auth.getCurrentUserId()) {
      this.error = 'You must be logged in (X-Actor-Id missing).';
      this.cdr.markForCheck();
      return;
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.search({
      email: this.filterEmail || undefined,
      status: (this.filterStatus || undefined) as UserStatus | undefined,
      role: (this.filterRole || undefined) as UserRole | undefined,
      page: this.page,
      size: this.size,
    })
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res) => {
          const data = res.data as PageResponse<User>;
          this.users = data?.content ?? [];
          this.totalPages = data?.totalPages ?? 0;
          this.totalElements = data?.totalElements ?? 0;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load users.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadUsers();
  }

  resetFilters(): void {
    this.filterEmail = '';
    this.filterStatus = '';
    this.filterRole = '';
    this.page = 0;
    this.loadUsers();
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
    this.error = null;
    this.success = null;
    if (!this.showCreate) this.createForm.reset({ role: 'CLIENT', status: 'ACTIVE' });
    this.cdr.markForCheck();
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    const v = this.createForm.getRawValue();
    const payload: UserRequest = {
      email: v.email,
      firstName: v.firstName,
      lastName: v.lastName,
      phoneNumber: v.phoneNumber,
      password: v.password,
      role: v.role,
      status: v.status,
    };

    this.vm.create(payload)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'User created successfully.';
          this.toast.success('User created successfully.');
          this.createForm.reset({ role: 'CLIENT', status: 'ACTIVE' });
          this.showCreate = false;
          this.filterEmail = '';
          this.filterStatus = '';
          this.filterRole = '';
          this.page = 0;
          this.loadUsers();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to create user.';
          this.cdr.markForCheck();
        }
      });
  }

  startEdit(user: User): void {
    if (!user.id) return;
    this.editId = user.id;
    this.editForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? '',
      password: '',
      role: (user.role ?? 'CLIENT') as UserRole,
      status: (user.status ?? 'ACTIVE') as UserStatus,
    });
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editId = null;
    this.cdr.markForCheck();
  }

  saveEdit(): void {
    if (this.editId == null || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    const v = this.editForm.getRawValue();
    const payload: UserRequest = {
      email: v.email,
      firstName: v.firstName,
      lastName: v.lastName,
      phoneNumber: v.phoneNumber,
      role: v.role,
      status: v.status,
    };
    if (v.password) payload.password = v.password;

    this.vm.update(this.editId, payload)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'User updated successfully.';
          this.toast.success('User updated successfully.');
          this.editId = null;
          this.loadUsers();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to update user.';
          this.cdr.markForCheck();
        }
      });
  }

  doAction(user: User, action: 'block' | 'suspend' | 'activate' | 'deactivate' | 'restore' | 'delete'): Promise<void> {
    if (!user.id) return Promise.resolve();

    return this.runAction(user, action);
  }

  private async runAction(user: User, action: 'block' | 'suspend' | 'activate' | 'deactivate' | 'restore' | 'delete'): Promise<void> {
    if (!user.id) return;

    const sensitive = action === 'delete' || action === 'block' || action === 'suspend' || action === 'deactivate';
    if (sensitive) {
      const labels: Record<string, string> = {
        delete: `Delete user ${user.email}? This cannot be undone.`,
        block: `Block ${user.email}? They will lose access to the platform.`,
        suspend: `Suspend ${user.email} temporarily?`,
        deactivate: `Deactivate ${user.email}?`,
      };
      const ok = await this.confirm.confirm({
        title: action === 'delete' ? 'Delete user' : 'Confirm action',
        message: labels[action],
        confirmLabel: action === 'delete' ? 'Delete' : 'Confirm',
        danger: true,
      });
      if (!ok) return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    const obs$ = (
      action === 'block' ? this.vm.block(user.id) :
      action === 'suspend' ? this.vm.suspend(user.id) :
      action === 'activate' ? this.vm.activate(user.id) :
      action === 'deactivate' ? this.vm.deactivate(user.id) :
      action === 'restore' ? this.vm.restore(user.id) :
      this.vm.delete(user.id)
    ) as Observable<any>;

    obs$
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          const msg = `Action "${action}" completed.`;
          this.success = msg;
          this.toast.success(msg);
          if (action === 'delete') {
            this.users = this.users.filter(u => u.id !== user.id);
            this.totalElements = Math.max(0, this.totalElements - 1);
          } else {
            this.loadUsers();
          }
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? `Unable to ${action} user.`;
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  openDetails(user: User): void {
    this.detailsUser = user;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.detailsUser = null;
    this.cdr.markForCheck();
  }

  changeRole(user: User): void {
    if (!user.id) return;
    const newRole = prompt('New role (ADMIN, AGENT, CLIENT):', user.role ?? 'CLIENT');
    if (!newRole) return;
    const role = newRole.toUpperCase() as UserRole;
    if (!['ADMIN', 'AGENT', 'CLIENT', 'SUPER_ADMIN'].includes(role)) {
      this.error = 'Invalid role.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    this.vm.changeRole(user.id, role)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = 'Role updated.';
          this.loadUsers();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to change role.';
          this.cdr.markForCheck();
        }
      });
  }

  getStatusClass(status: string): string {
    return `status--${(status || '').toLowerCase()}`;
  }

  getRoleClass(role: string): string {
    return `role--${(role || '').toLowerCase()}`;
  }

  trackById(_index: number, u: User): number | undefined {
    return u.id;
  }
}