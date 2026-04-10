import { Component, inject, PLATFORM_ID, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';

@Component({
    selector: 'app-budget',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, AppCurrencyPipe],
    templateUrl: './budget.html',
    styleUrls: ['./budget.css']
})
export class Budget implements OnInit {
    private authService = inject(AuthService);
    private dataService = inject(DataService);
    private cdr = inject(ChangeDetectorRef);
    private platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);
    userName: string = 'User';

    startDate: string = '';
    endDate: string = '';

    categories: any[] = [];
    allExpenses: any[] = [];
    budgets: any[] = [];
    isLoading: boolean = true;

    showBudgetForm: boolean = false;
    newBudget = {
        categoryId: '',
        limit: 0
    };

    constructor() {
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
        this.isLoading = true;
        this.dataService.getCategories('expense').subscribe(cats => {
            this.categories = cats;
            this.loadExpenses();
        });
    }

    // Silent refresh
    fetchDataForPolling() {
        // We re-fetch expenses to update 'spent' amounts
        this.dataService.getExpenses().subscribe(expenses => {
            this.allExpenses = expenses;
            this.calculateBudgets();
            this.cdr.detectChanges();
        });

        // Also re-fetch categories to check for limit changes from other devices?
        // Ideally yes, but might overwrite local edits if conflict. 
        // For now, let's stick to expense polling for progress bars.
    }

    loadExpenses() {
        this.dataService.getExpenses().subscribe(expenses => {
            this.allExpenses = expenses;
            this.calculateBudgets();
            this.isLoading = false;
            this.cdr.detectChanges();
        });
    }

    calculateBudgets() {
        let filteredExpenses = this.allExpenses;

        if (this.startDate && this.endDate) {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);

            filteredExpenses = this.allExpenses.filter(exp => {
                const date = new Date(exp.date);
                return date >= start && date <= end;
            });
        }

        // Map categories to budget objects
        this.budgets = this.categories.map(cat => {
            const spent = filteredExpenses
                .filter(e => e.category === cat.name)
                .reduce((acc, curr) => acc + curr.amount, 0);

            return {
                _id: cat._id,
                category: cat.name,
                limit: cat.budgetLimit || 0,
                spent: spent,
                color: cat.color || '#cccccc'
            };
        }).filter(b => b.limit > 0); // Only show budgets with a limit set
    }

    filterData() {
        this.calculateBudgets();
    }

    calculatePercentage(spent: number, limit: number): number {
        if (limit === 0) return spent > 0 ? 100 : 0;
        return Math.min((spent / limit) * 100, 100);
    }

    getBudgetStatus(spent: number, limit: number): string {
        if (limit === 0) return spent > 0 ? 'Over Budget' : 'No Limit Set';
        const percentage = (spent / limit) * 100;
        if (percentage >= 100) return 'Over Budget';
        if (percentage >= 80) return 'Near Limit';
        return 'On Track';
    }

    editLimit(budget: any) {
        const newLimit = prompt(`Enter new budget limit for ${budget.category}:`, budget.limit);
        if (newLimit !== null) {
            const limitVal = parseFloat(newLimit);
            if (!isNaN(limitVal)) {
                // Optimistic UI
                const originalLimit = budget.limit;
                // Update local category to ensure calculateBudgets works
                const cat = this.categories.find(c => c._id === budget._id);
                if (cat) cat.budgetLimit = limitVal;

                this.calculateBudgets(); // Recalculate status immediately

                this.dataService.updateCategory(budget._id, { budgetLimit: limitVal }).subscribe({
                    next: () => {
                        // Success, confirmed.
                    },
                    error: (err) => {
                        console.error('Error updating budget:', err);
                        alert('Failed to update limit.');
                        // Revert
                        if (cat) cat.budgetLimit = originalLimit;
                        this.calculateBudgets();
                    }
                });
            }
        }
    }

    toggleBudgetForm() {
        this.showBudgetForm = !this.showBudgetForm;
    }

    saveBudget() {
        if (this.newBudget.categoryId && this.newBudget.limit > 0) {
            // Optimistic update
            const catId = this.newBudget.categoryId;
            const limit = this.newBudget.limit;

            const catItem = this.categories.find(c => c._id === catId);
            if (catItem) catItem.budgetLimit = limit;

            this.calculateBudgets(); // Update list to include new budget

            this.dataService.updateCategory(catId, { budgetLimit: limit }).subscribe({
                next: () => {
                    this.showBudgetForm = false;
                    this.newBudget = { categoryId: '', limit: 0 };
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error updating budget:', err);
                    alert('Failed to update budget limit.');
                    // Revert? Hard to revert without deep copy or refetch. 
                    this.fetchData(); // Refetch to be safe
                }
            });
        } else {
            alert('Please select a category and enter a valid limit.');
        }
    }

    deleteBudget(catId: string) {
        if (confirm('Are you sure you want to remove the budget for this category?')) {
            // Optimistic update
            const cat = this.categories.find(c => c._id === catId);
            const originalLimit = cat ? cat.budgetLimit : 0;

            if (cat) cat.budgetLimit = 0;
            this.calculateBudgets(); // Update list to remove budget

            this.dataService.updateCategory(catId, { budgetLimit: 0 }).subscribe({
                next: () => {
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error deleting budget:', err);
                    alert('Failed to remove budget.');
                    // Revert
                    if (cat) cat.budgetLimit = originalLimit;
                    this.calculateBudgets();
                }
            });
        }
    }

    logout() {
        this.authService.logout();
    }

    getCategoryIcon(categoryName: string): string {
        const name = categoryName.toLowerCase();
        if (name.includes('food') || name.includes('grocer') || name.includes('dining')) return 'fa-solid fa-utensils';
        if (name.includes('transport') || name.includes('car') || name.includes('fuel') || name.includes('gas')) return 'fa-solid fa-car';
        if (name.includes('house') || name.includes('rent') || name.includes('home') || name.includes('bill')) return 'fa-solid fa-house';
        if (name.includes('entertain') || name.includes('movie') || name.includes('game')) return 'fa-solid fa-film';
        if (name.includes('health') || name.includes('medic') || name.includes('doctor')) return 'fa-solid fa-heart-pulse';
        if (name.includes('shop') || name.includes('cloth')) return 'fa-solid fa-bag-shopping';
        if (name.includes('travel') || name.includes('vacation') || name.includes('flight')) return 'fa-solid fa-plane';
        if (name.includes('educat') || name.includes('school') || name.includes('course')) return 'fa-solid fa-graduation-cap';
        if (name.includes('invest') || name.includes('save') || name.includes('bank')) return 'fa-solid fa-money-bill-trend-up';
        return 'fa-solid fa-wallet'; // Default
    }
}
