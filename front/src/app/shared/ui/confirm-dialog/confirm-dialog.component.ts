import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay confirm-overlay" *ngIf="confirm.state().open" (click)="confirm.respond(false)">
      <div class="modal-box modal-box--sm confirm-box" role="dialog" aria-modal="true"
           (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ confirm.state().title }}</h2>
          <button class="modal-close" type="button" (click)="confirm.respond(false)" aria-label="Fermer">×</button>
        </div>
        <div class="modal-body">
          <p class="confirm-message">{{ confirm.state().message }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn--secondary" type="button" (click)="confirm.respond(false)">
            {{ confirm.state().cancelLabel }}
          </button>
          <button class="btn" type="button"
                  [class.btn--danger]="confirm.state().danger"
                  [class.btn--primary]="!confirm.state().danger"
                  (click)="confirm.respond(true)">
            {{ confirm.state().confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-box { max-width: 440px; }
    .confirm-message { margin: 0; color: #475569; line-height: 1.55; font-size: .95rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
}
