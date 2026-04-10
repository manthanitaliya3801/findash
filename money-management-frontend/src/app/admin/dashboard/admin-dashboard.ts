import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AdminDataService, AdminStats, MonthlyTrend, TopCategory, RecentTransaction } from '../../services/admin-data.service';
import { AdminCurrencyService } from '../../services/admin-currency.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit, OnDestroy {
  private adminDataService = inject(AdminDataService);
  private adminCurrencyService = inject(AdminCurrencyService);
  private cdr = inject(ChangeDetectorRef);
  private currencySub?: Subscription;

  stats: AdminStats = {
    totalUsers: 0,
    totalTransactions: 0,
    totalIncomeAmount: 0,
    totalExpenseAmount: 0
  };

  recentUsers: any[] = [];
  monthlyTrend: MonthlyTrend[] = [];
  topCategories: TopCategory[] = [];
  recentTransactions: RecentTransaction[] = [];

  isLoading = true;
  isRefreshing = false;
  hasLoadedData = false;
  errorMessage = '';

  // Computed
  get totalVolume(): number {
    return this.stats.totalIncomeAmount + this.stats.totalExpenseAmount;
  }

  get incomePercent(): number {
    return this.totalVolume > 0 ? (this.stats.totalIncomeAmount / this.totalVolume) * 100 : 50;
  }

  get expensePercent(): number {
    return this.totalVolume > 0 ? (this.stats.totalExpenseAmount / this.totalVolume) * 100 : 50;
  }

  get netProfit(): number {
    return this.stats.totalIncomeAmount - this.stats.totalExpenseAmount;
  }

  // For monthly trend chart bars
  get maxMonthlyValue(): number {
    if (!this.monthlyTrend.length) return 1;
    return Math.max(...this.monthlyTrend.map(m => Math.max(m.income, m.expense)), 1);
  }

  ngOnInit() {
    this.fetchStats();
    // Re-render when admin switches currency
    this.currencySub = this.adminCurrencyService.currency$.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy() {
    this.currencySub?.unsubscribe();
  }

  fetchStats(forceRefresh = false) {
    if (this.hasLoadedData) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
    }
    this.errorMessage = '';

    this.adminDataService.getStats(forceRefresh).subscribe({
      next: (res: AdminStats) => {
        this.stats = res;
        this.recentUsers = res.recentUsers || [];
        this.monthlyTrend = res.monthlyTrend || [];
        this.topCategories = res.topExpenseCategories || [];
        this.recentTransactions = res.recentTransactions || [];
        this.hasLoadedData = true;
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching stats', err);
        this.isLoading = false;
        this.isRefreshing = false;
        this.errorMessage = 'Failed to load dashboard data. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  getBarHeight(value: number): string {
    const height = (value / this.maxMonthlyValue) * 100;
    return Math.max(height, 4) + '%';
  }

  getCategoryPercent(amount: number): number {
    const totalExpense = this.stats.totalExpenseAmount;
    return totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  formatCurrency(value: number): string {
    return this.adminCurrencyService.format(value);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours + 'h ago';
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return diffDays + 'd ago';
    return this.formatDate(dateStr);
  }
}
