import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { DataService } from '../services/data.service';
import { SidebarService } from '../services/sidebar.service';
import { AuthService } from '../services/auth.service';
import { CurrencyService } from '../services/currency.service';

@Component({
    selector: 'app-recurring',
    standalone: true,
    imports: [CommonModule, RouterModule, AppCurrencyPipe],
    templateUrl: './recurring.html',
    styleUrls: ['./recurring.css']
})
export class Recurring implements OnInit {
    private dataService = inject(DataService);
    private sidebarService = inject(SidebarService);
    private authService = inject(AuthService);
    private currencyService = inject(CurrencyService);
    private cdr = inject(ChangeDetectorRef);
    private platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);

    recurring: any[] = [];
    isLoading = true;
    activeFilter: 'all' | 'income' | 'expense' = 'all';
    currencySymbol = '$';

    get filtered(): any[] {
        if (this.activeFilter === 'all') return this.recurring;
        return this.recurring.filter(r => r.entryType === this.activeFilter);
    }

    get incomeCount(): number {
        return this.recurring.filter(r => r.entryType === 'income').length;
    }

    get expenseCount(): number {
        return this.recurring.filter(r => r.entryType === 'expense').length;
    }

    get totalMonthlyIncome(): number {
        return this.recurring
            .filter(r => r.entryType === 'income' && r.recurringInterval === 'monthly')
            .reduce((s, r) => s + r.amount, 0);
    }

    get totalMonthlyExpense(): number {
        return this.recurring
            .filter(r => r.entryType === 'expense' && r.recurringInterval === 'monthly')
            .reduce((s, r) => s + r.amount, 0);
    }

    ngOnInit() {
        if (this.isBrowser) {
            this.currencyService.currency$.subscribe(code => {
                const config = this.currencyService.getCurrencyConfig(code);
                this.currencySymbol = config?.symbol ?? '$';
            });
            this.loadData();
        }
    }

    loadData() {
        this.isLoading = true;
        this.dataService.getRecurring(true).subscribe({
            next: (res: any) => {
                this.recurring = res.recurring || [];
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => { this.isLoading = false; }
        });
    }

    getIntervalLabel(interval: string): string {
        const map: { [key: string]: string } = {
            daily: 'Every Day',
            weekly: 'Every Week',
            monthly: 'Every Month',
            yearly: 'Every Year',
            none: 'Once'
        };
        return map[interval] || interval;
    }

    getIntervalBadgeClass(interval: string): string {
        const map: { [key: string]: string } = {
            daily: 'badge-daily',
            weekly: 'badge-weekly',
            monthly: 'badge-monthly',
            yearly: 'badge-yearly'
        };
        return map[interval] || '';
    }

    getNextDueLabel(tx: any): string {
        if (!tx.nextDueDate) return '—';
        const due = new Date(tx.nextDueDate);
        const today = new Date();
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Due Today';
        if (diffDays === 1) return 'Due Tomorrow';
        return `Due in ${diffDays} days`;
    }

    getDueClass(tx: any): string {
        if (!tx.nextDueDate) return '';
        const due = new Date(tx.nextDueDate);
        const today = new Date();
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (diffDays < 0) return 'due-overdue';
        if (diffDays <= 2) return 'due-soon';
        return 'due-ok';
    }

    openMenu() { this.sidebarService.toggle(); }
    logout() { this.authService.logout(); }
}
