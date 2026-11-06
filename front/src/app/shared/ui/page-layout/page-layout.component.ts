import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shared page frame matching the /credit/list visual language:
 * gradient hero band + floating white card.
 */
@Component({
  selector: 'app-page-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-layout.component.html',
  styleUrl: './page-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageLayoutComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() accent = '';
  @Input() subtitle = '';
  @Input() badgeValue = '';
  @Input() badgeLabel = 'Portal';
  @Input() showBadge = true;
}
