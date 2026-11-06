import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

/** Promise-based confirmation dialog (replaces window.confirm with a styled modal). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private resolver: ((value: boolean) => void) | null = null;

  readonly state = signal<ConfirmState>({ open: false, message: '' });

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.resolver?.(false);
    this.state.set({
      open: true,
      title: 'Confirmation',
      confirmLabel: 'Confirmer',
      cancelLabel: 'Annuler',
      danger: false,
      ...options,
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  respond(value: boolean): void {
    this.state.update((s) => ({ ...s, open: false }));
    this.resolver?.(value);
    this.resolver = null;
  }
}
