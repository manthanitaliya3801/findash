import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface MonthlyTrend {
    label: string;
    income: number;
    expense: number;
}

export interface TopCategory {
    category: string;
    amount: number;
    count: number;
}

export interface RecentTransaction {
    _id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    userName: string;
}

export interface AdminStats {
    totalUsers: number;
    totalTransactions: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
    recentUsers?: any[];
    monthlyTrend?: MonthlyTrend[];
    topExpenseCategories?: TopCategory[];
    recentTransactions?: RecentTransaction[];
}

export interface TransactionFilters {
    userId?: string;
    type?: 'income' | 'expense' | 'all';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface TransactionListResponse {
    transactions: RecentTransaction[];
    total: number;
    totalPages: number;
    currentPage: number;
}

@Injectable({
    providedIn: 'root'
})
export class AdminDataService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly cacheTtlMs = 2 * 60_000;
    private readonly apiUrl = environment.apiUrl.replace('/api', '/api/v1/admin');

    private responseCache = new Map<string, { timestamp: number; value: unknown }>();
    private inflightRequests = new Map<string, Observable<unknown>>();

    private getHeaders(): Record<string, string> {
        const token = this.authService.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
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

    private invalidateCache(prefixes: string[]): void {
        for (const key of this.responseCache.keys()) {
            if (prefixes.some(prefix => key.startsWith(prefix))) {
                this.responseCache.delete(key);
            }
        }
    }

    getReports(forceRefresh = false): Observable<any> {
        return this.getCachedOrFetch(
            'admin-reports',
            () => this.http.get<any>(`${this.apiUrl}/reports`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    getStats(forceRefresh = false): Observable<AdminStats> {
        return this.getCachedOrFetch(
            'admin-stats',
            () => this.http.get<AdminStats>(`${this.apiUrl}/stats`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    getUsers(page: number = 1, limit: number = 10, forceRefresh = false): Observable<any> {
        const cacheKey = `admin-users-p${page}-l${limit}`;
        const queryParams = `?page=${page}&limit=${limit}`;

        return this.getCachedOrFetch(
            cacheKey,
            () => this.http.get<any>(`${this.apiUrl}/users${queryParams}`, { headers: this.getHeaders() }),
            forceRefresh
        );
    }

    deleteUser(userId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/users/${userId}`, { headers: this.getHeaders() }).pipe(
            tap(() => {
                this.invalidateCache(['admin-users', 'admin-stats']);
            })
        );
    }

    getTransactions(filters: TransactionFilters = {}): Observable<TransactionListResponse> {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.type && filters.type !== 'all') params.set('type', filters.type);
        if (filters.startDate) params.set('startDate', filters.startDate);
        if (filters.endDate) params.set('endDate', filters.endDate);
        params.set('page', String(filters.page || 1));
        params.set('limit', String(filters.limit || 20));
        const query = params.toString() ? `?${params.toString()}` : '';

        return this.http.get<TransactionListResponse>(
            `${this.apiUrl}/transactions${query}`,
            { headers: this.getHeaders() }
        );
    }

    deleteTransaction(type: 'income' | 'expense', id: string): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/transactions/${type}/${id}`,
            { headers: this.getHeaders() }
        ).pipe(
            tap(() => this.invalidateCache(['admin-stats']))
        );
    }

    changeAdminPassword(currentPassword: string, newPassword: string): Observable<any> {
        return this.http.put(
            `${this.apiUrl}/change-password`,
            { currentPassword, newPassword },
            { headers: this.getHeaders() }
        );
    }
}
