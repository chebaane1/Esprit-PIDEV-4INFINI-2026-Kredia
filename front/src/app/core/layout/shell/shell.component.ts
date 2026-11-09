import { ChangeDetectionStrategy, Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, FooterComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent implements OnInit {
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);

  isHomePage            = false;
  isLoginPage           = false;
  isSimulateurPage      = false;
  isPublicSimulateurPage = false; // simulateur + not authenticated

  sidebarOpen = false;

  get showSidebar(): boolean {
    return !this.isHomePage && !this.isPublicSimulateurPage;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.cdr.markForCheck();
  }

  closeSidebar(): void {
    if (!this.sidebarOpen) return;
    this.sidebarOpen = false;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.updateFlags(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateFlags(event.urlAfterRedirects || event.url);
      this.closeSidebar();
      this.cdr.markForCheck();
    });
  }

  private updateFlags(url: string): void {
    const path = url.split('?')[0];
    this.isHomePage             = path === '/' || path === '/home';
    this.isLoginPage            = path === '/login';
    this.isSimulateurPage       = path === '/simulateur';
    // Public layout only when not logged in
    this.isPublicSimulateurPage = this.isSimulateurPage && !this.auth.isLoggedIn();
  }
}
