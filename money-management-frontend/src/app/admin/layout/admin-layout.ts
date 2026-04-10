import { Component, OnInit, OnDestroy, inject, signal, HostListener, PLATFORM_ID } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AdminDataService } from '../../services/admin-data.service';
import { AuthService } from '../../services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayout implements OnInit, OnDestroy {
  private adminDataService = inject(AdminDataService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  sidebarOpen = signal(false);
  isMobile = signal(false);

  adminName = 'Admin';
  adminInitial = 'A';

  private routerSub?: Subscription;

  ngOnInit() {
    // Preload admin data so child routes get instant cache hits
    this.adminDataService.getStats().subscribe();
    this.adminDataService.getUsers(1, 10).subscribe();

    // Read admin user info
    const user = this.authService.getUser();
    if (user) {
      this.adminName = user.name || user.email || 'Admin';
      this.adminInitial = this.adminName.charAt(0).toUpperCase();
    }

    // Close sidebar automatically on route navigation (mobile)
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile()) this.closeSidebar();
    });

    if (this.isBrowser) {
      this.checkMobile();
    }
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isBrowser) this.checkMobile();
  }

  private checkMobile() {
    const mobile = window.innerWidth <= 1024;
    this.isMobile.set(mobile);
    // Auto-open sidebar on desktop
    if (!mobile) this.sidebarOpen.set(false);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
