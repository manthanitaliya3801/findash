import { Component, signal, computed, PLATFORM_ID, inject, HostListener } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';
import { ThemeService } from './services/theme.service';
import { SidebarComponent } from './sidebar/sidebar';
import { DataService } from './services/data.service';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule, SidebarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('findash');
  private authService = inject(AuthService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private themeService = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  isSidebarCollapsed = signal(this.getInitialSidebarState());
  currentRoute = signal('');

  // Computed property to determine if sidebar should be shown
  // Admin routes have their own sidebar via AdminLayout, so exclude them here
  showSidebar = computed(() => {
    const route = this.currentRoute();
    const isAuthRoute = route === '/login' || route === '/register' || route === '';
    const isAdminRoute = route.startsWith('/admin');
    return !isAuthRoute && !isAdminRoute;
  });

  constructor() {
    // Track route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute.set(event.urlAfterRedirects || event.url);
    });

    // Set initial route
    this.currentRoute.set(this.router.url);

    // Subscribe to sidebar toggle from child components
    this.sidebarService.toggle$.subscribe(() => this.toggleSidebar());

    if (this.isBrowser) {
      this.handleResize();
    }
  }

  // Determine initial sidebar state based on screen size
  private getInitialSidebarState(): boolean {
    if (!this.isBrowser) return true;
    return window.innerWidth <= 768;
  }

  isMobile(): boolean {
    if (!this.isBrowser) return false;
    return window.innerWidth <= 768;
  }

  isAdmin = computed(() => {
    const user = this.authService.currentUser();   // ← reactive signal, not plain localStorage read
    return user != null && user.role === 'admin';
  });

  // Modal State
  isModalOpen = false;
  newTransaction = {
    title: '',
    amount: null,
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    description: ''
  };
  categories: any[] = [];

  private dataService = inject(DataService);

  openQuickAdd() {
    this.isModalOpen = true;
    this.resetForm();
    this.fetchCategories();
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.newTransaction = {
      title: '',
      amount: null,
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      description: ''
    };
  }

  fetchCategories() {
    const type = this.newTransaction.type === 'income' ? 'income' : 'expense';
    this.dataService.getCategories(type).subscribe({
      next: (res) => {
        this.categories = res;
      },
      error: (err) => console.error('Error fetching categories', err)
    });
  }

  onTypeChange(type: string) {
    this.newTransaction.type = type;
    this.fetchCategories();
  }

  submitTransaction() {
    if (!this.newTransaction.title || !this.newTransaction.amount) return;

    const payload = { ...this.newTransaction };

    if (this.newTransaction.type === 'income') {
      this.dataService.addIncome(payload).subscribe({
        next: () => {
          this.closeModal();
          this.refreshCurrentPage();
        },
        error: (err) => alert('Error adding income')
      });
    } else {
      this.dataService.addExpense(payload).subscribe({
        next: () => {
          this.closeModal();
          this.refreshCurrentPage();
        },
        error: (err) => alert('Error adding expense')
      });
    }
  }

  refreshCurrentPage() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.isBrowser) return;
    this.handleResize();
  }

  private handleResize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.isSidebarCollapsed.set(true);
      return;
    }
    this.isSidebarCollapsed.set(false);
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update(value => !value);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
