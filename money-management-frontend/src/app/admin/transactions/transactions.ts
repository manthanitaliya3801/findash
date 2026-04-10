import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, TransactionFilters, RecentTransaction } from '../../services/admin-data.service';

interface UserOption {
    _id: string;
    name: string;
    email: string;
}

@Component({
    selector: 'app-admin-transactions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './transactions.html',
    styleUrls: ['./transactions.css']
})
export class AdminTransactions implements OnInit {
    private adminDataService = inject(AdminDataService);
    private cdr = inject(ChangeDetectorRef);

    transactions: RecentTransaction[] = [];
    users: UserOption[] = [];

    // Filters
    selectedUserId = '';
    selectedType: 'all' | 'income' | 'expense' = 'all';
    startDate = '';
    endDate = '';

    // Pagination
    currentPage = 1;
    totalPages = 1;
    totalCount = 0;
    pageSize = 20;

    // State
    isLoading = true;
    errorMessage = '';
    deletingId: string | null = null;
    confirmDeleteId: string | null = null;
    successMessage = '';

    ngOnInit() {
        this.loadUsers();
        this.loadTransactions();
    }

    loadUsers() {
        this.adminDataService.getUsers(1, 100).subscribe({
            next: (res) => {
                this.users = res.users || [];
                this.cdr.detectChanges();
            },
            error: () => { }
        });
    }

    loadTransactions(page = 1) {
        this.isLoading = true;
        this.errorMessage = '';
        const filters: TransactionFilters = {
            type: this.selectedType,
            page,
            limit: this.pageSize
        };
        if (this.selectedUserId) filters.userId = this.selectedUserId;
        if (this.startDate) filters.startDate = this.startDate;
        if (this.endDate) filters.endDate = this.endDate;

        this.adminDataService.getTransactions(filters).subscribe({
            next: (res) => {
                this.transactions = res.transactions;
                this.currentPage = res.currentPage;
                this.totalPages = res.totalPages;
                this.totalCount = res.total;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.errorMessage = err?.error?.message || 'Failed to load transactions.';
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadTransactions(1);
    }

    resetFilters() {
        this.selectedUserId = '';
        this.selectedType = 'all';
        this.startDate = '';
        this.endDate = '';
        this.applyFilters();
    }

    goToPage(page: number) {
        if (page < 1 || page > this.totalPages) return;
        this.loadTransactions(page);
    }

    confirmDelete(id: string) {
        this.confirmDeleteId = id;
    }

    cancelDelete() {
        this.confirmDeleteId = null;
    }

    deleteTransaction(tx: RecentTransaction) {
        this.deletingId = tx._id;
        this.confirmDeleteId = null;
        this.adminDataService.deleteTransaction(tx.type as 'income' | 'expense', tx._id).subscribe({
            next: () => {
                this.successMessage = 'Transaction deleted successfully.';
                this.deletingId = null;
                this.loadTransactions(this.currentPage);
                setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 3000);
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.errorMessage = err?.error?.message || 'Failed to delete transaction.';
                this.deletingId = null;
                this.cdr.detectChanges();
            }
        });
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatAmount(amount: number): string {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    get pages(): number[] {
        const start = Math.max(1, this.currentPage - 2);
        const end = Math.min(this.totalPages, this.currentPage + 2);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
}
