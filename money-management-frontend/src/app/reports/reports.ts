import { Component, inject, PLATFORM_ID, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ensureChartsRegistered } from '../utils/chart-register';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, RouterModule, BaseChartDirective, FormsModule, AppCurrencyPipe],
    templateUrl: './reports.html',
    styleUrls: ['./reports.css']
})
export class Reports implements OnInit {
    private authService = inject(AuthService);
    private dataService = inject(DataService);
    private cdr = inject(ChangeDetectorRef);
    private platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);
    userName: string = 'User';

    startDate: string = '';
    endDate: string = '';

    allIncomes: any[] = [];
    allExpenses: any[] = [];

    totalIncome: number = 0;
    totalExpense: number = 0;
    netSavings: number = 0;

    // Annual Income vs Expense
    public barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } }
    };
    public barChartType: ChartType = 'bar';
    public barChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [
            { data: [], label: 'Income', backgroundColor: '#5C9CE6' },
            { data: [], label: 'Expense', backgroundColor: '#FDB44B' }
        ]
    };

    // Expense by Category
    public pieChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
    };
    public pieChartType: ChartType = 'doughnut';
    public pieChartData: ChartData<'doughnut', number[], string | string[]> = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#6FD195', '#5C9CE6', '#26C6DA', '#FDB44B', '#FF7043', '#5E35B1'],
            hoverOffset: 4
        }]
    };

    constructor() {
        ensureChartsRegistered();

        if (this.isBrowser) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                this.userName = user.name || 'User';
            }
        }
    }

    ngOnInit() {
        if (this.isBrowser) {
            this.fetchData();
        }
    }

    fetchData() {
        forkJoin({
            incomes: this.dataService.getIncomes(),
            expenses: this.dataService.getExpenses()
        }).subscribe({
            next: ({ incomes, expenses }) => {
                this.allIncomes = incomes;
                this.allExpenses = expenses;
                this.updateCharts();
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error fetching report data', err);
            }
        });
    }

    savingsRate: number = 0;

    filterData() {
        this.updateCharts();
    }

    updateCharts() {
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
        }

        // Calculate Totals
        this.totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
        this.totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        this.netSavings = this.totalIncome - this.totalExpense;
        this.savingsRate = this.totalIncome > 0 ? (this.netSavings / this.totalIncome) * 100 : 0;

        // Update Bar Chart (Monthly)
        const incomeByMonth = new Array(12).fill(0);
        const expenseByMonth = new Array(12).fill(0);

        filteredIncomes.forEach(inc => {
            const month = new Date(inc.date).getMonth();
            incomeByMonth[month] += inc.amount;
        });

        filteredExpenses.forEach(exp => {
            const month = new Date(exp.date).getMonth();
            expenseByMonth[month] += exp.amount;
        });

        this.barChartData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                { data: incomeByMonth, label: 'Income', backgroundColor: '#5C9CE6' },
                { data: expenseByMonth, label: 'Expense', backgroundColor: '#FDB44B' }
            ]
        };

        // Update Pie Chart (Category)
        const expensesByCategory: { [key: string]: number } = {};
        filteredExpenses.forEach(exp => {
            expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
        });

        this.pieChartData = {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: ['#6FD195', '#5C9CE6', '#26C6DA', '#FDB44B', '#FF7043', '#5E35B1'],
                hoverOffset: 4
            }]
        };
    }

    exportToCSV() {
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
        const rows: any[] = [];

        let filteredIncomes = this.allIncomes;
        let filteredExpenses = this.allExpenses;

        if (this.startDate && this.endDate) {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);
            filteredIncomes = this.allIncomes.filter(i => new Date(i.date) >= start && new Date(i.date) <= end);
            filteredExpenses = this.allExpenses.filter(e => new Date(e.date) >= start && new Date(e.date) <= end);
        }

        filteredIncomes.forEach(i => rows.push([new Date(i.date).toLocaleDateString(), 'Income', i.category, i.description, i.amount]));
        filteredExpenses.forEach(e => rows.push([new Date(e.date).toLocaleDateString(), 'Expense', e.category, e.description, -e.amount]));

        rows.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "financial_report.csv");
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);
    }

    logout() {
        this.authService.logout();
    }
}
