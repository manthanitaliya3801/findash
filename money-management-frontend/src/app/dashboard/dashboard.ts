import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { SidebarService } from '../services/sidebar.service';
import { CurrencyService } from '../services/currency.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subscription, forkJoin } from 'rxjs';
import { ensureChartsRegistered } from '../utils/chart-register';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, BaseChartDirective, FormsModule, AppCurrencyPipe],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private dataService = inject(DataService);
    private router = inject(Router);
    private sidebarService = inject(SidebarService);
    private currencyService = inject(CurrencyService);
    private cdr = inject(ChangeDetectorRef);
    private platformId = inject(PLATFORM_ID);

    isBrowser = isPlatformBrowser(this.platformId);
    userName: string = 'User';
    currentDate: Date = new Date();
    currentCurrencySymbol: string = '$';

    private currencySubscription?: Subscription;

    // Summary Cards Data
    totalIncome = 0;
    totalExpense = 0;
    budgetLeft = 0;
    savings = 0;
    savingsGoal = 10000;
    isDataLoaded = false;

    incomes: any[] = [];
    expenses: any[] = [];
    recentTransactions: any[] = [];

    get netSavings(): number {
        return this.totalIncome - this.totalExpense;
    }

    // Monthly Navigator
    readonly monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    selectedMonth: number = new Date().getMonth();
    selectedYear: number = new Date().getFullYear();

    get selectedMonthLabel(): string {
        return this.monthNames[this.selectedMonth] + ' ' + this.selectedYear;
    }

    get monthlyIncome(): number {
        return this.allIncomes
            .filter(i => { const d = new Date(i.date); return d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear; })
            .reduce((s, i) => s + i.amount, 0);
    }

    get monthlyExpense(): number {
        return this.allExpenses
            .filter(e => { const d = new Date(e.date); return d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear; })
            .reduce((s, e) => s + e.amount, 0);
    }

    get monthlyNet(): number { return this.monthlyIncome - this.monthlyExpense; }

    prevMonth() {
        if (this.selectedMonth === 0) { this.selectedMonth = 11; this.selectedYear--; }
        else { this.selectedMonth--; }
    }

    nextMonth() {
        const now = new Date();
        if (this.selectedYear === now.getFullYear() && this.selectedMonth === now.getMonth()) return;
        if (this.selectedMonth === 11) { this.selectedMonth = 0; this.selectedYear++; }
        else { this.selectedMonth++; }
    }

    ngOnInit() {
        if (this.isBrowser) {
            this.fetchData();

            // Subscribe to currency changes
            this.currencySubscription = this.currencyService.currency$.subscribe(code => {
                const config = this.currencyService.getCurrencyConfig(code);
                this.currentCurrencySymbol = config ? config.symbol : '$';
                this.updateChartCurrency();
            });
        }
    }

    updateChartCurrency() {
        if (this.revenueChartOptions?.scales?.['y']?.ticks) {
            this.revenueChartOptions.scales['y'].ticks.callback = (value) =>
                this.currentCurrencySymbol + value;
        }

        if (this.cashflowChartOptions?.scales?.['y']?.ticks) {
            this.cashflowChartOptions.scales['y'].ticks.callback = (value) =>
                (Number(value) < 0 ? '-' : '') + this.currentCurrencySymbol + Math.abs(Number(value));
        }

        // Force chart update if needed, though usually option change requires re-assignment or specific trigger
        // Creating new references to trigger change detection in ng2-charts
        this.revenueChartOptions = { ...this.revenueChartOptions };
        this.cashflowChartOptions = { ...this.cashflowChartOptions };
        this.cdr.detectChanges();
    }

    // --- Revenue Bar Chart ---
    public revenueChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, boxWidth: 8, padding: 20, font: { family: 'Inter', size: 12 } }
            },
            title: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { drawTicks: false, color: '#f0f0f0' },
                ticks: {
                    callback: (value) => this.currentCurrencySymbol + value,
                    font: { family: 'Inter', size: 11 },
                    color: '#9CA3AF'
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 12 }, color: '#9CA3AF' },
                border: { display: false }
            }
        },
        interaction: { intersect: false, mode: 'index' },
        // @ts-ignore
        borderRadius: 4
    };
    public revenueChartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    public revenueChartData: ChartData<'bar'> = {
        labels: this.revenueChartLabels,
        datasets: [
            { data: [0, 0, 0, 0, 0, 0], label: 'Current', backgroundColor: '#3E3378', barThickness: 12 },
            { data: [0, 0, 0, 0, 0, 0], label: 'Projection', backgroundColor: '#009EF7', barThickness: 12 }
        ]
    };
    public revenueChartType: ChartType = 'bar';

    // --- Cashflow Line Chart ---
    public cashflowChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        elements: {
            line: { tension: 0.4 },
            point: { radius: 0, hoverRadius: 6 }
        },
        scales: {
            y: {
                display: true,
                grid: { color: '#f0f0f0', drawTicks: false },
                ticks: {
                    callback: (value) => (Number(value) < 0 ? '-' : '') + this.currentCurrencySymbol + Math.abs(Number(value)),
                    font: { family: 'Inter', size: 11 },
                    color: '#9CA3AF'
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 12 }, color: '#9CA3AF' },
                border: { display: false }
            }
        }
    };
    public cashflowChartData: ChartData<'line'> = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                data: [0, 0, 0, 0, 0, 0],
                label: 'Income',
                borderColor: '#009EF7',
                backgroundColor: 'rgba(0, 158, 247, 0.1)',
                borderWidth: 2,
                fill: false
            },
            {
                data: [0, 0, 0, 0, 0, 0],
                label: 'Expenses',
                borderColor: '#7239EA',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false
            }
        ]
    };
    public cashflowChartType: ChartType = 'line';

    // --- Expenses Donut Chart ---
    public expenseDonutOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        // @ts-ignore
        cutout: '75%',
        plugins: {
            legend: {
                position: 'right',
                labels: { boxWidth: 10, usePointStyle: true, font: { family: 'Inter', size: 12 }, padding: 20 }
            },
        }
    };
    public expenseDonutData: ChartData<'doughnut'> = {
        labels: ['Loading...'],
        datasets: [{
            data: [100],
            backgroundColor: ['#E4E6EF'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };
    public expenseDonutType: ChartType = 'doughnut';

    constructor() {
        ensureChartsRegistered();

        // Load user
        if (typeof localStorage !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                this.userName = user.name || 'User';
            }
        }
    }



    ngOnDestroy() {
        this.currencySubscription?.unsubscribe();
    }

    // Date Filtering
    startDate: string = '';
    endDate: string = '';
    allIncomes: any[] = [];
    allExpenses: any[] = [];

    fetchData() {
        // We still fetch dashboard data for initial view, but we rely on full lists for filtering
        this.dataService.getDashboardData().subscribe({
            next: (res) => {
                // Initial stats from server (could be replaced by local calc if consistent)
                this.totalIncome = res.totalIncome;
                this.totalExpense = res.totalExpense;
                this.budgetLeft = res.totalBalance; // Note: Balance might be tricky to filter as it's a running total usually. 
                // For Dashboard "Balance" usually means "Current Wallet", which doesn't change with date filter.
                // But Income/Expense totals DO change. 

                // Transactions
                this.recentTransactions = res.recentHistory.map((t: any) => ({
                    id: '#' + (t._id ? t._id.substring(t._id.length - 5) : '00000'),
                    type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
                    date: new Date(t.date).toLocaleDateString(),
                    rawDate: new Date(t.date), // Keep raw date for sorting/filtering locally if needed
                    amount: t.type === 'expense' ? -t.amount : t.amount,
                    status: 'Completed',
                    statusClass: 'completed',
                    category: t.category,
                    description: t.description
                }));

                this.fetchChartData();
                this.isDataLoaded = true;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching dashboard data', err)
        });
    }

    fetchChartData() {
        forkJoin({
            incomes: this.dataService.getIncomes(),
            expenses: this.dataService.getExpenses()
        }).subscribe({
            next: ({ incomes, expenses }) => {
                this.allIncomes = incomes;
                this.allExpenses = expenses;
                this.incomes = incomes;
                this.expenses = expenses;
                this.filterData();
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching chart data:', err)
        });
    }

    filterData() {
        let filteredIncomes = this.allIncomes;
        let filteredExpenses = this.allExpenses;

        if (this.startDate && this.endDate) {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);

            filteredIncomes = this.allIncomes.filter(inc => {
                const date = new Date(inc.date);
                return date >= start && date <= end;
            });

            filteredExpenses = this.allExpenses.filter(exp => {
                const date = new Date(exp.date);
                return date >= start && date <= end;
            });

            // Recalculate Totals for the period
            this.totalIncome = filteredIncomes.reduce((acc, curr: any) => acc + curr.amount, 0);
            this.totalExpense = filteredExpenses.reduce((acc, curr: any) => acc + curr.amount, 0);
            // Budget Left (Net Savings for period)
            this.budgetLeft = this.totalIncome - this.totalExpense;
        } else {
            // Reset to defaults (or whatever logic for "All Time")
            // Actually, if no date selected, maybe show current month? Or All Time?
            // App seems to default to All Time for totals usually. 
            // But let's recalculate from ALL data to be consistent
            this.totalIncome = this.allIncomes.reduce((acc, curr) => acc + curr.amount, 0);
            this.totalExpense = this.allExpenses.reduce((acc, curr) => acc + curr.amount, 0);
            this.budgetLeft = this.totalIncome - this.totalExpense;
        }

        this.incomes = filteredIncomes;
        this.expenses = filteredExpenses;

        this.updateRevenueChart();
        this.processExpenseChart(this.expenses);
        this.cdr.detectChanges();
    }

    updateCharts() {
        // Delegated to filterData
    }

    // ... (Charts methods use this.incomes / this.expenses which are now filtered)

    hasFinancialData(): boolean {
        // Check filtering result
        return (this.incomes.length > 0 || this.expenses.length > 0);
    }

    // ...Existing methods...

    processExpenseChart(expenses: any[]) {
        // ... existing logic ...
        if (!expenses || expenses.length === 0) {
            this.expenseDonutData = {
                labels: [],
                datasets: [{ data: [], backgroundColor: [] }]
            };
            return;
        }

        const categoryMap: { [key: string]: number } = {};
        expenses.forEach(e => {
            const cat = e.category || 'Other';
            categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
        });

        const labels = Object.keys(categoryMap);
        const data = Object.values(categoryMap);
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#E7E9ED', '#71B37C', '#EC932F', '#5D6D7E'
        ];

        this.expenseDonutData = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                hoverOffset: 4,
                borderWidth: 0
            }]
        };
    }

    updateRevenueChart() {
        // Uses this.incomes and this.expenses
        if (!this.incomes.length && !this.expenses.length) {
            this.revenueChartData = { labels: [], datasets: [] };
            return;
        }

        // Logic to group by month. 
        // If filtered by date range, maybe show days? 
        // For now, keep monthly aggregation but only for the filtered data.
        // Or if range < 1 month, show days.

        // Let's stick to existing "Last 6 Months" bucket logic but applied to current data?
        // Actually, if I filter 2023, I want to see 2023 months.
        // The previous logic was "Last 6 Months from TODAY".
        // I should make it dynamic based on the data range.

        // Simple Dynamic approach:
        // Find min and max date in data.
        // Create buckets.

        // ... (rest of logic can remain simple or be improved. Let's keep existing 6 month logic for now, but apply to filtered data 
        // which might result in empty bars if data is outside 6 months. That's a UX issue.)
        // Fix: If filter is active, align chart to filter.

        let startChartDate = new Date();
        if (this.startDate) startChartDate = new Date(this.startDate);
        else startChartDate.setMonth(startChartDate.getMonth() - 5); // Default 6 months back

        // ... Doing a full replacement of updateRevenueChart is better.

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Collect all dates to find range
        const allDates = [...this.incomes, ...this.expenses].map(d => new Date(d.date).getTime());
        if (allDates.length === 0) return;

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));

        // Determine label strategy
        // If range <= 31 days -> Daily
        // Else -> Monthly

        const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24);

        const labels: string[] = [];
        const incomeData: number[] = [];
        const expenseData: number[] = [];

        if (diffDays <= 31 && diffDays > 0) {
            // Daily
            for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
                labels.push(d.getDate() + ' ' + months[d.getMonth()]);
                incomeData.push(0);
                expenseData.push(0);
            }
        } else {
            // Monthly (show all months in range)
            // Or just last 6 months if range is huge? 
            // Let's dynamic.
            const s = new Date(minDate); s.setDate(1);
            const e = new Date(maxDate); e.setDate(1);

            for (let d = new Date(s); d <= e; d.setMonth(d.getMonth() + 1)) {
                labels.push(months[d.getMonth()] + ' ' + d.getFullYear().toString().substr(2, 2));
                incomeData.push(0);
                expenseData.push(0);
            }
            // limit to 12 bars max for readability?
            if (labels.length > 12) {
                // simplify?
            }
        }

        this.revenueChartLabels = labels;

        // Bucketing (Optimized)
        const getLabelIndex = (date: Date) => {
            const dStr = date.getDate() + ' ' + months[date.getMonth()];
            const mStr = months[date.getMonth()] + ' ' + date.getFullYear().toString().substr(2, 2);
            if (diffDays <= 31) return labels.indexOf(dStr);
            return labels.indexOf(mStr);
        };

        this.incomes.forEach(i => {
            const idx = getLabelIndex(new Date(i.date));
            if (idx !== -1) incomeData[idx] += i.amount;
        });

        this.expenses.forEach(e => {
            const idx = getLabelIndex(new Date(e.date));
            if (idx !== -1) expenseData[idx] += e.amount;
        });

        this.revenueChartData = {
            labels: this.revenueChartLabels,
            datasets: [
                { data: incomeData, label: 'Income', backgroundColor: '#10b981', barThickness: 10, borderRadius: 4 },
                { data: expenseData, label: 'Expense', backgroundColor: '#ef4444', barThickness: 10, borderRadius: 4 }
            ]
        };
        this.revenueChartType = 'bar';
    }

    // Modal & Form Data
    isModalOpen = false;
    isCurrencyDropdownOpen = false;
    isTimeDropdownOpen = false;

    selectedCurrency = 'USD';
    selectedTimeRange = '6 Months';

    newTransaction = {
        title: '',
        amount: null,
        type: 'income', // 'income' or 'expense'
        date: new Date().toISOString().split('T')[0],
        category: 'General',
        description: ''
    };

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        // Reset form
        this.newTransaction = {
            title: '',
            amount: null,
            type: 'income',
            date: new Date().toISOString().split('T')[0],
            category: 'General',
            description: ''
        };
    }

    toggleCurrencyDropdown() {
        this.isCurrencyDropdownOpen = !this.isCurrencyDropdownOpen;
        this.isTimeDropdownOpen = false; // Close others
    }

    selectCurrency(currency: string) {
        this.selectedCurrency = currency;
        this.isCurrencyDropdownOpen = false;
        // Logic to update currency symbol would go here, currently visual only
    }

    toggleTimeDropdown() {
        this.isTimeDropdownOpen = !this.isTimeDropdownOpen;
        this.isCurrencyDropdownOpen = false; // Close others
    }

    selectTimeRange(range: string) {
        this.selectedTimeRange = range;
        this.isTimeDropdownOpen = false;

        // Calculate date range based on selection
        let newStartDate = '';
        let newEndDate = new Date().toISOString().split('T')[0]; // Today

        const today = new Date();

        switch (range) {
            case 'Last 6 Months':
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                newStartDate = sixMonthsAgo.toISOString().split('T')[0];
                break;
            case 'This Year':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                newStartDate = yearStart.toISOString().split('T')[0];
                break;
            case 'Last Year':
                const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
                const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                newStartDate = lastYearStart.toISOString().split('T')[0];
                newEndDate = lastYearEnd.toISOString().split('T')[0];
                break;
            case 'All Time':
                // Clear date filters to show all data
                newStartDate = '';
                newEndDate = '';
                break;
            default:
                newStartDate = '';
                newEndDate = '';
        }

        // Update date filters
        this.startDate = newStartDate;
        this.endDate = newEndDate;

        // Apply filters to update charts
        this.filterData();
    }

    submitTransaction() {
        if (!this.newTransaction.title || !this.newTransaction.amount) return;

        const payload = { ...this.newTransaction };

        if (this.newTransaction.type === 'income') {
            this.dataService.addIncome(payload).subscribe(() => {
                this.closeModal();
                this.fetchData(); // Refresh data
            });
        } else {
            this.dataService.addExpense(payload).subscribe(() => {
                this.closeModal();
                this.fetchData(); // Refresh data
            });
        }
    }

    logout() {
        this.authService.logout();
    }

    openMenu() {
        this.sidebarService.toggle();
    }
}
