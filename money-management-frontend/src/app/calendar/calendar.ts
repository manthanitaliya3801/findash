import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { SidebarService } from '../services/sidebar.service';
import { CurrencyService } from '../services/currency.service';
import { forkJoin } from 'rxjs';

interface CalendarDay {
    date: Date | null;
    dayNum: number | null;
    incomeTotal: number;
    expenseTotal: number;
    transactions: any[];
    isToday: boolean;
    isCurrentMonth: boolean;
}

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [CommonModule, RouterModule, AppCurrencyPipe],
    templateUrl: './calendar.html',
    styleUrls: ['./calendar.css']
})
export class CalendarView implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private dataService = inject(DataService);
    private sidebarService = inject(SidebarService);
    private currencyService = inject(CurrencyService);
    private cdr = inject(ChangeDetectorRef);
    private platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);

    currentDate = new Date();
    displayMonth: number = new Date().getMonth();
    displayYear: number = new Date().getFullYear();

    readonly monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    calendarDays: CalendarDay[] = [];
    allIncomes: any[] = [];
    allExpenses: any[] = [];

    selectedDay: CalendarDay | null = null;
    isPanelOpen = false;

    currencySymbol = '$';

    get monthLabel(): string {
        return `${this.monthNames[this.displayMonth]} ${this.displayYear}`;
    }

    get monthlyIncome(): number {
        return this.calendarDays.reduce((s, d) => s + d.incomeTotal, 0);
    }

    get monthlyExpense(): number {
        return this.calendarDays.reduce((s, d) => s + d.expenseTotal, 0);
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

    ngOnDestroy() {}

    loadData() {
        forkJoin({
            incomes: this.dataService.getIncomes(),
            expenses: this.dataService.getExpenses()
        }).subscribe({
            next: ({ incomes, expenses }) => {
                this.allIncomes = incomes;
                this.allExpenses = expenses;
                this.buildCalendar();
                this.cdr.detectChanges();
            }
        });
    }

    buildCalendar() {
        const year = this.displayYear;
        const month = this.displayMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Filter transactions for this month
        const monthIncomes = this.allIncomes.filter(i => {
            const d = new Date(i.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
        const monthExpenses = this.allExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Build day map
        const dayMap: { [key: number]: { incomes: any[], expenses: any[] } } = {};
        monthIncomes.forEach(i => {
            const day = new Date(i.date).getDate();
            if (!dayMap[day]) dayMap[day] = { incomes: [], expenses: [] };
            dayMap[day].incomes.push({ ...i, entryType: 'income' });
        });
        monthExpenses.forEach(e => {
            const day = new Date(e.date).getDate();
            if (!dayMap[day]) dayMap[day] = { incomes: [], expenses: [] };
            dayMap[day].expenses.push({ ...e, entryType: 'expense' });
        });

        this.calendarDays = [];

        // Leading blank days
        for (let i = 0; i < firstDay; i++) {
            this.calendarDays.push({ date: null, dayNum: null, incomeTotal: 0, expenseTotal: 0, transactions: [], isToday: false, isCurrentMonth: false });
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const data = dayMap[d] || { incomes: [], expenses: [] };
            const incomeTotal = data.incomes.reduce((s: number, i: any) => s + i.amount, 0);
            const expenseTotal = data.expenses.reduce((s: number, e: any) => s + e.amount, 0);
            const transactions = [...data.incomes, ...data.expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const isToday = date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();

            this.calendarDays.push({ date, dayNum: d, incomeTotal, expenseTotal, transactions, isToday, isCurrentMonth: true });
        }
    }

    prevMonth() {
        if (this.displayMonth === 0) { this.displayMonth = 11; this.displayYear--; }
        else { this.displayMonth--; }
        this.closePanel();
        this.buildCalendar();
    }

    nextMonth() {
        if (this.displayMonth === 11) { this.displayMonth = 0; this.displayYear++; }
        else { this.displayMonth++; }
        this.closePanel();
        this.buildCalendar();
    }

    goToToday() {
        this.displayMonth = new Date().getMonth();
        this.displayYear = new Date().getFullYear();
        this.closePanel();
        this.buildCalendar();
    }

    selectDay(day: CalendarDay) {
        if (!day.isCurrentMonth || !day.dayNum) return;
        if (this.selectedDay === day && this.isPanelOpen) {
            this.closePanel();
            return;
        }
        this.selectedDay = day;
        this.isPanelOpen = true;
    }

    closePanel() {
        this.isPanelOpen = false;
        this.selectedDay = null;
    }

    openMenu() {
        this.sidebarService.toggle();
    }
}
