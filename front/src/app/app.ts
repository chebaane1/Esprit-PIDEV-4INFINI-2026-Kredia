import { Component, inject, effect } from '@angular/core';
import { ShellComponent } from './core/layout/shell/shell.component';
import { ToastContainerComponent } from './core/layout/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';
import { DarkModeService } from './core/services/dark-mode.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent, ToastContainerComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  darkModeService = inject(DarkModeService);

  constructor() {
    // Initialize dark mode on app startup
    this.darkModeService.init();
    
    // Apply mode change when signal changes
    effect(() => {
      this.darkModeService.isDarkMode();
    });
  }
}
