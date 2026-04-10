import { Component, inject, PLATFORM_ID, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';

@Component({
    selector: 'app-savings',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, AppCurrencyPipe],
    templateUrl: './savings.html',
    styleUrls: ['./savings.css']
})
export class Savings implements OnInit {
    private authService = inject(AuthService);
    private dataService = inject(DataService);
    private cdr = inject(ChangeDetectorRef);
    private platformId = inject(PLATFORM_ID);
    isBrowser = isPlatformBrowser(this.platformId);
    userName: string = 'User';

    savingsGoals: any[] = [];
    totalSavings: number = 0;
    showForm: boolean = false;
    showDepositForm: boolean = false;
    editMode: boolean = false;
    currentGoalId: string | null = null;
    isLoading: boolean = true;

    // Current month balance
    currentMonthBalance: number = 0;
    currentMonthLabel: string = '';
    currentGoalForDeposit: any = null;

    newGoal = {
        title: '',
        targetAmount: 0,
        currentAmount: 0,
        icon: 'fa-solid fa-piggy-bank'
    };

    // Quick-select goal category examples
    goalCategories: { label: string; icon: string }[] = [
        { label: 'Home', icon: 'fa-solid fa-house' },
        { label: 'Car', icon: 'fa-solid fa-car' },
        { label: 'Travel', icon: 'fa-solid fa-plane' },
        { label: 'Education', icon: 'fa-solid fa-graduation-cap' },
        { label: 'Gadget', icon: 'fa-solid fa-laptop' },
        { label: 'Emergency', icon: 'fa-solid fa-shield-heart' },
        { label: 'Wedding', icon: 'fa-solid fa-heart' },
        { label: 'Gift', icon: 'fa-solid fa-gift' },
        { label: 'Fitness', icon: 'fa-solid fa-dumbbell' },
        { label: 'Business', icon: 'fa-solid fa-briefcase' },
    ];

    availableIcons: string[] = [
        'fa-solid fa-piggy-bank',
        'fa-solid fa-car',
        'fa-solid fa-house',
        'fa-solid fa-plane',
        'fa-solid fa-graduation-cap',
        'fa-solid fa-mobile-screen',
        'fa-solid fa-laptop',
        'fa-solid fa-gift',
        'fa-solid fa-bicycle',
        'fa-solid fa-heart',
        'fa-solid fa-baby-carriage',
        'fa-solid fa-couch',
        'fa-solid fa-camera',
        'fa-solid fa-guitar',
        'fa-solid fa-briefcase',
        'fa-solid fa-gamepad'
    ];

    selectIcon(iconClass: string) {
        this.newGoal.icon = iconClass;
    }

    selectCategoryExample(cat: { label: string; icon: string }) {
        this.newGoal.title = cat.label;
        this.newGoal.icon = cat.icon;
        // Also highlight the icon in the picker
        if (this.availableIcons.includes(cat.icon)) {
            this.newGoal.icon = cat.icon;
        }
    }

    depositAmount: number = 0;

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
            this.fetchGoals();
            this.computeCurrentMonthBalance();
        }
    }

    getIconClass(icon: string | undefined): string {
        if (!icon || icon === '💰' || !icon.includes('fa-')) {
            return 'fa-solid fa-piggy-bank';
        }
        return icon;
    }

    computeCurrentMonthBalance() {
        const now = new Date();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        this.currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        const year = now.getFullYear();
        const month = now.getMonth();

        let totalIncome = 0;
        let totalExpense = 0;
        let loaded = 0;

        const check = () => {
            if (++loaded === 2) {
                this.currentMonthBalance = Math.max(0, totalIncome - totalExpense);
                this.cdr.detectChanges();
            }
        };

        this.dataService.getIncomes().subscribe({
            next: (incomes: any[]) => {
                totalIncome = (incomes || []).filter((i: any) => {
                    const d = new Date(i.date);
                    return d.getFullYear() === year && d.getMonth() === month;
                }).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
                check();
            },
            error: () => check()
        });

        this.dataService.getExpenses().subscribe({
            next: (expenses: any[]) => {
                totalExpense = (expenses || []).filter((e: any) => {
                    const d = new Date(e.date);
                    return d.getFullYear() === year && d.getMonth() === month;
                }).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
                check();
            },
            error: () => check()
        });
    }

    fetchGoals() {
        this.dataService.getSavingGoals().subscribe({
            next: (goals) => {
                this.savingsGoals = goals;
                this.calculateTotalSavings();
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error fetching saving goals:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    calculatePercentage(current: number, target: number): number {
        return Math.min((current / target) * 100, 100);
    }

    calculateTotalSavings() {
        this.totalSavings = this.savingsGoals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
    }

    toggleForm() {
        this.showForm = !this.showForm;
        if (!this.showForm) {
            this.resetForm();
        }
    }

    toggleDepositForm() {
        this.showDepositForm = !this.showDepositForm;
        this.depositAmount = 0;
        this.currentGoalForDeposit = null;
    }

    resetForm() {
        this.editMode = false;
        this.currentGoalId = null;
        this.newGoal = { title: '', targetAmount: 0, currentAmount: 0, icon: 'fa-solid fa-piggy-bank' };
    }

    openEditForm(goal: any) {
        this.showForm = true;
        this.editMode = true;
        this.currentGoalId = goal._id;
        this.newGoal = { ...goal };
    }

    openDepositForm(goal: any) {
        this.currentGoalId = goal._id;
        this.currentGoalForDeposit = goal;
        this.showDepositForm = true;
        this.depositAmount = 0;
    }

    get maxDepositAllowed(): number {
        if (!this.currentGoalForDeposit) return this.currentMonthBalance;
        const remaining = this.currentGoalForDeposit.targetAmount - (this.currentGoalForDeposit.currentAmount || 0);
        return Math.min(this.currentMonthBalance, Math.max(0, remaining));
    }

    submitDeposit() {
        if (!this.currentGoalId || this.depositAmount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        if (this.depositAmount > this.currentMonthBalance) {
            alert(`You cannot deposit more than your current month's balance of ${this.currentMonthBalance.toFixed(2)}.`);
            return;
        }

        const goal = this.savingsGoals.find(g => g._id === this.currentGoalId);
        if (!goal) return;

        const newAmount = (goal.currentAmount || 0) + this.depositAmount;

        // Optimistic update
        const originalAmount = goal.currentAmount;
        goal.currentAmount = newAmount;
        this.calculateTotalSavings();

        this.dataService.updateSavingGoal(this.currentGoalId, { currentAmount: newAmount }).subscribe({
            next: (res) => {
                this.showDepositForm = false;
                if (res && res.savingGoal) {
                    const index = this.savingsGoals.findIndex(g => g._id === this.currentGoalId);
                    if (index !== -1) this.savingsGoals[index] = res.savingGoal;
                    this.calculateTotalSavings();
                }

                // Automatic Expense Creation
                const expensePayload = {
                    title: `Deposit to ${goal.title}`,
                    amount: this.depositAmount,
                    type: 'expense',
                    date: new Date().toISOString().split('T')[0],
                    category: 'Savings',
                    description: 'Automatic expense from savings deposit'
                };

                this.dataService.addExpense(expensePayload).subscribe({
                    next: () => {
                        // Refresh balance after deposit
                        this.computeCurrentMonthBalance();
                    },
                    error: (e) => console.error('Error creating expense for deposit:', e)
                });

                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error depositing:', err);
                alert('Deposit failed');
                goal.currentAmount = originalAmount;
                this.calculateTotalSavings();
                this.cdr.detectChanges();
            }
        });
    }

    saveGoal() {
        if (!this.newGoal.title || this.newGoal.targetAmount <= 0) {
            alert('Please enter a valid title and target amount (greater than 0).');
            return;
        }

        if (this.editMode && this.currentGoalId) {
            this.dataService.updateSavingGoal(this.currentGoalId, this.newGoal).subscribe({
                next: (res) => {
                    this.fetchGoals();
                    this.showForm = false;
                    this.resetForm();
                    this.cdr.detectChanges();
                },
                error: (err) => console.error('Error updating goal:', err)
            });
        } else {
            this.dataService.addSavingGoal(this.newGoal).subscribe({
                next: (res) => {
                    this.fetchGoals();
                    this.showForm = false;
                    this.resetForm();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error adding saving goal:', err);
                    alert('Failed to add saving goal. Please try again.');
                    this.cdr.detectChanges();
                }
            });
        }
    }

    deleteGoal(id: string) {
        if (confirm('Are you sure you want to delete this goal?')) {
            this.dataService.deleteSavingGoal(id).subscribe(() => {
                this.fetchGoals();
            });
        }
    }

    logout() {
        this.authService.logout();
    }
}
