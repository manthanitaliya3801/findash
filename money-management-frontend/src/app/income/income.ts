import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { CurrencyService } from '../services/currency.service';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subscription } from 'rxjs';
import { ensureChartsRegistered } from '../utils/chart-register';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BaseChartDirective, AppCurrencyPipe],
  templateUrl: './income.html',
  styleUrls: ['./income.css']
})
export class Income implements OnInit, OnDestroy {
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
  incomes: any[] = [];
  allIncomes: any[] = [];
  searchTerm: string = '';
  sortOption: string = 'dateDesc';
  editMode: boolean = false;
  currentId: string | null = null;
  categories: any[] = [];
  totalIncome: number = 0;

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

  get monthlyCount(): number {
    return this.allIncomes
      .filter(i => { const d = new Date(i.date); return d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear; }).length;
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

  isModalOpen = false;
  isCategoryManagerOpen = false;

  private currencySubscription?: Subscription;

  newIncome = {
    title: '',
    amount: null,
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    type: 'income'
  };

  // Chart Data
  public incomePieOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' }
    }
  };
  public incomePieData: ChartData<'pie'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };
  public incomePieType: ChartType = 'pie';

  // Income Trend Line Chart
  public incomeTrendOptions: ChartConfiguration['options'] = {
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
  public incomeTrendData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Income',
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };
  public incomeTrendType: ChartType = 'line';

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

      this.fetchIncomes();
      this.fetchCategories();
    }
  }

  updateChartCurrency() {
    if (this.incomeTrendOptions?.scales?.['y']?.ticks) {
      this.incomeTrendOptions.scales['y'].ticks.callback = (value) => this.currentCurrencySymbol + value;
    }
    this.incomeTrendOptions = { ...this.incomeTrendOptions };
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.currencySubscription?.unsubscribe();
  }

  fetchIncomes() {
    this.dataService.getIncomes().subscribe({
      next: (res) => {
        this.allIncomes = res;
        this.applyFilters();
        this.processIncomeChart(res);
        this.processIncomeTrend(res);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching incomes', err)
    });
  }

  applyFilters() {
    let temp = [...this.allIncomes];

    if (this.searchTerm) {
      const lower = this.searchTerm.toLowerCase();
      temp = temp.filter(i =>
        i.title.toLowerCase().includes(lower) ||
        (i.description && i.description.toLowerCase().includes(lower)) ||
        i.category.toLowerCase().includes(lower)
      );
    }

    if (this.sortOption === 'dateDesc') {
      temp.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (this.sortOption === 'dateAsc') {
      temp.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (this.sortOption === 'amountDesc') {
      temp.sort((a, b) => b.amount - a.amount);
    } else if (this.sortOption === 'amountAsc') {
      temp.sort((a, b) => a.amount - b.amount);
    }

    this.incomes = temp;
    this.totalIncome = this.incomes.reduce((acc, curr) => acc + curr.amount, 0);
  }

  processIncomeChart(incomes: any[]) {
    const categoryMap: { [key: string]: number } = {};
    incomes.forEach(i => {
      const cat = i.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + i.amount;
    });

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);
    const backgroundColors = [
      '#10B981', '#34D399', '#6EE7B7', '#059669', '#A7F3D0',
      '#065F46', '#047857', '#064E3B', '#10B981', '#34D399'
    ];

    this.incomePieData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        hoverOffset: 4
      }]
    };
  }

  fetchCategories() {
    this.dataService.getCategories('income').subscribe({
      next: (res) => {
        this.categories = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching categories', err)
    });
  }

  openModal() {
    this.isModalOpen = true;
    this.editMode = false;
    this.currentId = null;
    this.resetForm(); // Ensure clean state
    if (this.categories.length > 0) {
      this.newIncome.category = this.categories[0].name;
    }
  }

  openEditModal(item: any) {
    this.isModalOpen = true;
    this.editMode = true;
    this.currentId = item._id;
    this.newIncome = {
      title: item.title,
      amount: item.amount,
      date: new Date(item.date).toISOString().split('T')[0],
      category: item.category,
      description: item.description || '',
      type: 'income'
    };
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.newIncome = {
      title: '',
      amount: null,
      date: new Date().toISOString().split('T')[0],
      category: this.categories.length > 0 ? this.categories[0].name : '',
      description: '',
      type: 'income'
    };
  }

  submitIncome() {
    if (!this.newIncome.title || !this.newIncome.amount) return;

    if (this.editMode && this.currentId) {
      this.dataService.updateIncome(this.currentId, this.newIncome).subscribe({
        next: () => {
          this.closeModal();
          this.fetchIncomes(); // Re-fetch from server
        },
        error: (err) => {
          console.error('Error updating income', err);
          alert(err.error?.message || 'Error updating income');
        }
      });
    } else {
      this.dataService.addIncome(this.newIncome).subscribe({
        next: (res: any) => {
          this.closeModal();
          this.fetchIncomes(); // Re-fetch from server
        },
        error: (err) => {
          console.error('Error adding income', err);
          alert(err.error?.message || 'Error adding income');
        }
      });
    }
  }

  deleteIncome(id: string) {
    if (!confirm('Delete this income record?')) return;

    this.dataService.deleteIncome(id).subscribe({
      next: () => {
        this.fetchIncomes(); // Re-fetch from server
      },
      error: (err) => console.error('Error deleting income', err)
    });
  }

  updateLocalState() {
    this.applyFilters();
    this.processIncomeChart(this.allIncomes);
    this.processIncomeTrend(this.allIncomes);
    this.cdr.detectChanges();
  }

  logout() {
    this.authService.logout();
  }

  processIncomeTrend(incomes: any[]) {
    // Group by month for last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      labels.push(monthName);

      // Filter incomes for this month and year
      const monthlyTotal = incomes
        .filter(inc => {
          const incDate = new Date(inc.date);
          return incDate.getMonth() === d.getMonth() && incDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inc) => sum + inc.amount, 0);

      data.push(monthlyTotal);
    }

    this.incomeTrendData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Income',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#10B981',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }
}
