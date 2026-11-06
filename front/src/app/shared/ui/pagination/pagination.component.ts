import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagination" *ngIf="totalPages > 1">
      <button class="btn btn--secondary btn--small" type="button" (click)="previous.emit()" [disabled]="page === 0">
        ← Précédent
      </button>
      <span class="pagination__info">
        Page {{ page + 1 }} / {{ totalPages }}<ng-container *ngIf="totalElements != null"> · {{ totalElements }} élément(s)</ng-container>
      </span>
      <button class="btn btn--secondary btn--small" type="button" (click)="next.emit()" [disabled]="page + 1 >= totalPages">
        Suivant →
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  @Input() page = 0;
  @Input() totalPages = 0;
  @Input() totalElements: number | null = null;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
