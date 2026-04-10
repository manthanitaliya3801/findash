import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly cacheTtlMs = 60_000; // 60s — reduces API calls when navigating between pages
    private responseCache = new Map<string, { timestamp: number; value: unknown }>();
    private inflightRequests = new Map<string, Observable<unknown>>();

    private get baseUrl(): string {
        // Use the dynamic apiUrl from environment and append /v1
        return environment.apiUrl.replace('/api', '/api/v1');
    }

    constructor() { }

    private getHeaders(): Record<string, string> {
        const token = this.authService.getToken();
        // Never send "Bearer null/undefined" (causes jwt malformed on backend)
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    private getCategoryCacheKey(type?: string): string {
        return `categories:${type ?? 'all'}`;
    }

    private getCachedOrFetch<T>(
        cacheKey: string,
        requestFactory: () => Observable<T>,
        forceRefresh = false
    ): Observable<T> {
        if (!forceRefresh) {
            const cached = this.responseCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTtlMs) {
                return of(cached.value as T);
            }

            const inflight = this.inflightRequests.get(cacheKey);
            if (inflight) {
                return inflight as Observable<T>;
            }
        }

        const request$ = requestFactory().pipe(
            tap((value) => {
                this.responseCache.set(cacheKey, { timestamp: Date.now(), value });
            }),
            finalize(() => {
                this.inflightRequests.delete(cacheKey);
            }),
            shareReplay(1)
        );

        this.inflightRequests.set(cacheKey, request$ as Observable<unknown>);
        return request$;
    }

    private invalidateCache(keys: string[]): void {
        keys.forEach((key) => this.responseCache.delete(key));
    }

    private invalidateCacheByPrefix(prefixes: string[]): void {
        for (const key of this.responseCache.keys()) {
            if (prefixes.some((prefix) => key.startsWith(prefix))) {
                this.responseCache.delete(key);
            }
        }
    }

    // Categories
    addCategory(category: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/category/add-category`, category, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCacheByPrefix(['categories:']);
            })
        );
    }

    getCategories(type?: string, forceRefresh = false): Observable<any> {
        let url = `${this.baseUrl}/category/get-categories`;
        if (type) {
            url += `?type=${type}`;
        }

        return this.getCachedOrFetch(
            this.getCategoryCacheKey(type),
            () => this.http.get(url, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    deleteCategory(id: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/category/delete-category/${id}`, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCacheByPrefix(['categories:']);
            })
        );
    }

    // Incomes
    addIncome(income: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/add-income`, income, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['incomes', 'dashboard']);
            })
        );
    }

    getIncomes(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'incomes',
            () => this.http.get(`${this.baseUrl}/get-incomes`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    deleteIncome(id: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/delete-income/${id}`, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['incomes', 'dashboard']);
            })
        );
    }

    updateIncome(id: string, income: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/update-income/${id}`, income, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['incomes', 'dashboard']);
            })
        );
    }

    // Expenses
    addExpense(expense: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/add-expense`, expense, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['expenses', 'dashboard']);
            })
        );
    }

    getExpenses(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'expenses',
            () => this.http.get(`${this.baseUrl}/get-expenses`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    deleteExpense(id: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/delete-expense/${id}`, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['expenses', 'dashboard']);
            })
        );
    }

    updateExpense(id: string, expense: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/update-expense/${id}`, expense, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['expenses', 'dashboard']);
            })
        );
    }

    // Dashboard
    getDashboardData(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'dashboard',
            () => this.http.get(`${this.baseUrl}/dashboard`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    // Category Update (for Budget limits)
    updateCategory(id: string, data: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/category/update-category/${id}`, data, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCacheByPrefix(['categories:']);
            })
        );
    }

    // Savings Goals
    addSavingGoal(goal: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/add-goal`, goal, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['saving-goals']);
            })
        );
    }

    getSavingGoals(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'saving-goals',
            () => this.http.get(`${this.baseUrl}/get-goals`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    updateSavingGoal(id: string, goal: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/update-goal/${id}`, goal, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['saving-goals']);
            })
        );
    }

    deleteSavingGoal(id: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/delete-goal/${id}`, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['saving-goals']);
            })
        );
    }

    // ── Feature: Notifications ──────────────────────────────────────────────────
    getNotifications(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'notifications',
            () => this.http.get(`${this.baseUrl}/notifications`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    // ── Feature: Financial Health Score ────────────────────────────────────────
    getHealthScore(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'health-score',
            () => this.http.get(`${this.baseUrl}/health-score`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    // ── Feature: Recurring Transactions ────────────────────────────────────────
    getRecurring(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'recurring',
            () => this.http.get(`${this.baseUrl}/recurring`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    // ── Feature: Budget Suggestions ────────────────────────────────────────────
    getBudgetSuggestions(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'budget-suggestions',
            () => this.http.get(`${this.baseUrl}/budget/suggestions`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    // ── Feature: Monthly Comparison (Reports) ──────────────────────────────────
    getMonthlyComparison(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'monthly-comparison',
            () => this.http.get(`${this.baseUrl}/reports/monthly-comparison`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }
}

