import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminCurrencyService } from '../../services/admin-currency.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-admin-reports',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reports.html',
    styleUrls: ['./reports.css']
})
export class AdminReports implements OnInit, OnDestroy {
    private adminData = inject(AdminDataService);
    private adminCurrencyService = inject(AdminCurrencyService);
    private cdr = inject(ChangeDetectorRef);
    private currencySub?: Subscription;

    isLoading = true;
    isRefreshing = false;
    errorMessage = '';

    overview: any = {};
    growth: any = {};
    monthlyTrend: any[] = [];
    topIncomeCategories: any[] = [];
    topExpenseCategories: any[] = [];
    perUserStats: any[] = [];
    recentTransactions: any[] = [];

    // Chart helpers
    get maxMonthlyValue(): number {
        if (!this.monthlyTrend.length) return 1;
        return Math.max(...this.monthlyTrend.map(m => Math.max(m.income, m.expense)), 1);
    }

    get totalIncomeCategories(): number {
        return this.topIncomeCategories.reduce((s, c) => s + c.amount, 0);
    }

    get totalExpenseCategories(): number {
        return this.topExpenseCategories.reduce((s, c) => s + c.amount, 0);
    }

    ngOnInit() {
        this.fetchReport();
        this.currencySub = this.adminCurrencyService.currency$.subscribe(() => this.cdr.detectChanges());
    }

    ngOnDestroy() {
        this.currencySub?.unsubscribe();
    }

    fetchReport(forceRefresh = false) {
        if (this.overview.totalUsers != null) {
            this.isRefreshing = true;
        } else {
            this.isLoading = true;
        }
        this.errorMessage = '';

        this.adminData.getReports(forceRefresh).subscribe({
            next: (data: any) => {
                this.overview = data.overview || {};
                this.growth = data.growth || {};
                this.monthlyTrend = data.monthlyTrend || [];
                this.topIncomeCategories = data.topIncomeCategories || [];
                this.topExpenseCategories = data.topExpenseCategories || [];
                this.perUserStats = data.perUserStats || [];
                this.recentTransactions = data.recentTransactions || [];
                this.isLoading = false;
                this.isRefreshing = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.errorMessage = 'Failed to load report data.';
                this.isLoading = false;
                this.isRefreshing = false;
                this.cdr.detectChanges();
            }
        });
    }

    formatCurrency(value: number): string {
        if (value == null) return this.adminCurrencyService.getCurrencyConfig().symbol + '0.00';
        return this.adminCurrencyService.format(value);
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    growthSign(val: number): string {
        if (val > 0) return '+';
        return '';
    }

    getBarHeight(value: number): string {
        return Math.max((value / this.maxMonthlyValue) * 100, 4) + '%';
    }

    getCategoryPercent(amount: number, total: number): number {
        return total > 0 ? (amount / total) * 100 : 0;
    }

    getInitials(name: string): string {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
}
