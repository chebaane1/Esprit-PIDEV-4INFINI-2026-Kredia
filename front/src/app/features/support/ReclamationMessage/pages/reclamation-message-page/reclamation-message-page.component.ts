import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ReclamationMessageVm } from '../../vm/reclamation-message.vm';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { PageLayoutComponent } from '../../../../../shared/ui/page-layout/page-layout.component';
import { ReclamationMessage, ReclamationMessageCreateRequest, MessageVisibility } from '../../models/reclamation-message.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayoutComponent],
  templateUrl: './reclamation-message-page.component.html',
  styleUrl: './reclamation-message-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReclamationMessagePageComponent implements OnInit, AfterViewChecked {
  private readonly vm = inject(ReclamationMessageVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('thread') thread?: ElementRef<HTMLElement>;

  messages: ReclamationMessage[] = [];
  loading = false;
  sending = false;
  error: string | null = null;

  reclamationId: number | null = null;
  includeInternal = false;

  newMessage = {
    authorUserId: this.auth.getCurrentUserId() ?? 0,
    visibility: 'CUSTOMER' as MessageVisibility,
    message: '',
  };

  private shouldScroll = false;

  get isStaff(): boolean {
    return this.auth.isAdminOrAgent();
  }

  get currentUserId(): number | null {
    return this.auth.getCurrentUserId();
  }

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('reclamationId');
    if (param) {
      const id = Number(param);
      if (!Number.isNaN(id) && id > 0) {
        this.reclamationId = id;
        this.loadMessages();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      this.scrollToBottom();
    }
  }

  loadMessages(): void {
    if (!this.reclamationId) {
      this.error = 'Please enter a reclamation ID.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.vm.getByReclamation(this.reclamationId, this.includeInternal && this.isStaff)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (data) => {
          this.messages = data ?? [];
          this.shouldScroll = true;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'Unable to load messages.';
          this.cdr.markForCheck();
        }
      });
  }

  refresh(): void {
    if (this.reclamationId) this.loadMessages();
  }

  send(): void {
    if (!this.reclamationId || !this.newMessage.message.trim()) {
      this.error = 'A message is required.';
      this.cdr.markForCheck();
      return;
    }

    this.sending = true;
    this.error = null;
    this.cdr.markForCheck();

    const payload: ReclamationMessageCreateRequest = {
      authorUserId: this.newMessage.authorUserId || this.currentUserId || 0,
      visibility: this.isStaff ? this.newMessage.visibility : 'CUSTOMER',
      message: this.newMessage.message.trim(),
    };

    this.vm.send(this.reclamationId, payload)
      .pipe(finalize(() => { this.sending = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.toast.success('Message sent.');
          this.newMessage.message = '';
          this.loadMessages();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? err?.error?.error ?? 'Unable to send message.';
          this.error = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.send();
    }
  }

  isOwn(message: ReclamationMessage): boolean {
    return this.currentUserId != null && message.authorUserId === this.currentUserId;
  }

  getVisibilityClass(visibility: string): string {
    return visibility === 'INTERNAL' ? 'badge status--escalated' : 'badge status--active';
  }

  trackByMessageId(_index: number, m: ReclamationMessage): number | undefined {
    return m.messageId;
  }

  private scrollToBottom(): void {
    const el = this.thread?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
