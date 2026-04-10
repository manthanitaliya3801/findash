import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { CurrencyService } from '../services/currency.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subscription } from 'rxjs';
import { ensureChartsRegistered } from '../utils/chart-register';



@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BaseChartDirective, AppCurrencyPipe],
  templateUrl: './expenses.html',
  styleUrls: ['./expenses.css']
})
export class Expenses implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private currencyService = inject(CurrencyService); // Added
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  userName: string = 'User';
  currentCurrencySymbol: string = '$'; // Added

  // ... (existing properties)
  expenses: any[] = [];
  allExpenses: any[] = [];
  searchTerm: string = '';
  sortOption: string = 'dateDesc';
  editMode: boolean = false;
  currentId: string | null = null;
  categories: any[] = []; // Store fetched categories
  totalExpenses: number = 0;

  // Monthly Navigator
  readonly monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear();

  get selectedMonthLabel(): string {
    return this.monthNames[this.selectedMonth] + ' ' + this.selectedYear;
  }

  get monthlyExpense(): number {
    return this.allExpenses
      .filter(e => { const d = e.rawDate ? e.rawDate : new Date(e.date); return d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear; })
      .reduce((s, e) => s + e.amount, 0);
  }

  get monthlyCount(): number {
    return this.allExpenses
      .filter(e => { const d = e.rawDate ? e.rawDate : new Date(e.date); return d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear; }).length;
  }

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

  // Modal State
  isModalOpen = false;
  isCategoryManagerOpen = false;

  private currencySubscription?: Subscription;

  newExpense = {
    title: '',
    amount: null,
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '', // dynamic
    description: ''
  };

  // Chart Data
  public expensePieOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' }
    }
  };
  public expensePieData: ChartData<'pie'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };
  public expensePieType: ChartType = 'pie';

  // Expense Trend Line Chart
  public expenseTrendOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '6 Month Trend' }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.currentCurrencySymbol + value
        }
      }
    }
  };
  public expenseTrendData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Expense',
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };
  public expenseTrendType: ChartType = 'line';

  constructor() {
    ensureChartsRegistered();

    if (typeof localStorage !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.userName = user.name || 'User';
      }
    }
  }

  ngOnInit() {
    // Avoid SSR/prerender calling protected APIs or chart code
    if (this.isBrowser) {
      // Subscribe to currency
      this.currencySubscription = this.currencyService.currency$.subscribe(code => {
        const config = this.currencyService.getCurrencyConfig(code);
        this.currentCurrencySymbol = config ? config.symbol : '$';
        this.updateChartCurrency();
      });

      this.fetchExpenses();
      this.fetchCategories();
    }
  }

  updateChartCurrency() {
    if (this.expenseTrendOptions?.scales?.['y']?.ticks) {
      this.expenseTrendOptions.scales['y'].ticks.callback = (value) => this.currentCurrencySymbol + value;
    }
    this.expenseTrendOptions = { ...this.expenseTrendOptions };
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.currencySubscription?.unsubscribe();
  }

  fetchCategories() {
    this.dataService.getCategories('expense').subscribe({
      next: (res) => {
        this.categories = res;
        // Set default category if available and not set
        if (this.categories.length > 0 && !this.newExpense.category) {
          this.newExpense.category = this.categories[0].name;
        }
      },
      error: (err) => console.error('Error fetching categories:', err)
    });
  }

  fetchExpenses() {
    this.dataService.getExpenses().subscribe({
      next: (res) => {
        // Store formatted list in allExpenses
        this.allExpenses = res.map((item: any) => ({
          ...item,
          rawDate: new Date(item.date), // Keep raw for sorting
          date: new Date(item.date).toLocaleDateString()
        }));

        this.applyFilters();
        this.processExpenseChart(res);
        this.processExpenseTrend(res);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching expenses:', err)
    });
  }

  applyFilters() {
    let temp = [...this.allExpenses];

    if (this.searchTerm) {
      const lower = this.searchTerm.toLowerCase();
      temp = temp.filter(i =>
        i.title.toLowerCase().includes(lower) ||
        (i.description && i.description.toLowerCase().includes(lower)) ||
        i.category.toLowerCase().includes(lower)
      );
    }

    // Sort using rawDate
    if (this.sortOption === 'dateDesc') {
      temp.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    } else if (this.sortOption === 'dateAsc') {
      temp.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    } else if (this.sortOption === 'amountDesc') {
      temp.sort((a, b) => b.amount - a.amount);
    } else if (this.sortOption === 'amountAsc') {
      temp.sort((a, b) => a.amount - b.amount);
    }

    this.expenses = temp;
    this.totalExpenses = this.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }

  processExpenseChart(expenses: any[]) {
    const categoryMap: { [key: string]: number } = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
    });

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);
    const backgroundColors = [
      '#EF4444', '#F87171', '#FCA5A5', '#FCA5A5', '#FECACA',
      '#B91C1C', '#991B1B', '#7F1D1D', '#EF4444', '#F87171'
    ];

    this.expensePieData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        hoverOffset: 4
      }]
    };
  }

  openModal() {
    this.isModalOpen = true;
    this.editMode = false;
    this.currentId = null;
    this.resetForm();
  }

  openEditModal(item: any) {
    this.isModalOpen = true;
    this.editMode = true;
    this.currentId = item._id;
    // Convert formatted date back to YYYY-MM-DD for input? 
    // Or use rawDate if available? 
    // The item comes from expenseList which has rawDate now.

    const d = item.rawDate ? item.rawDate : new Date(item.date);
    // Wait, item.date is locale string now. item.rawDate is Date obj.

    this.newExpense = {
      title: item.title,
      amount: item.amount,
      type: 'expense',
      date: d.toISOString().split('T')[0],
      category: item.category,
      description: item.description || ''
    };
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.newExpense = {
      title: '',
      amount: null,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      category: this.categories.length > 0 ? this.categories[0].name : '',
      description: ''
    };
  }

  submitExpense() {
    if (!this.newExpense.title || !this.newExpense.amount) return;

    if (this.editMode && this.currentId) {
      this.dataService.updateExpense(this.currentId, this.newExpense).subscribe({
        next: (res) => {
          this.closeModal();
          this.fetchExpenses(); // Re-fetch from server
        },
        error: (err) => console.error('Error updating expense:', err)
      });
    } else {
      this.dataService.addExpense(this.newExpense).subscribe({
        next: (res: any) => {
          this.closeModal();
          this.fetchExpenses(); // Re-fetch from server
        },
        error: (err) => console.error('Error adding expense:', err)
      });
    }
  }

  deleteExpense(id: string) {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.dataService.deleteExpense(id).subscribe({
        next: () => {
          this.fetchExpenses(); // Re-fetch from server
        },
        error: (err) => console.error('Error deleting expense:', err)
      });
    }
  }

  updateLocalState() {
    this.applyFilters();
    this.processExpenseChart(this.expenses); // Use filtered or all? Using filtered usually
    // Actually charts need all data mostly, or filtered?
    // existing code passed 'res' (all items) to charts.
    this.processExpenseChart(this.allExpenses);
    this.processExpenseTrend(this.allExpenses);
    this.cdr.detectChanges();
  }

  logout() {
    this.authService.logout();
  }

  processExpenseTrend(expenses: any[]) {
    // Group by month for last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      labels.push(monthName);

      // Filter expenses for this month and year
      const monthlyTotal = expenses
        .filter(exp => {
          const expDate = exp.rawDate ? exp.rawDate : new Date(exp.date); // Use rawDate if available
          return expDate.getMonth() === d.getMonth() && expDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      data.push(monthlyTotal);
    }

    this.expenseTrendData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Expense',
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#EF4444',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }
}
