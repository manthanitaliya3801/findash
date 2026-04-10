import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AdminCurrencyConfig {
    code: string;
    symbol: string;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class AdminCurrencyService {
    private readonly STORAGE_KEY = 'admin_currency'; // separate from user 'currency' key

    readonly currencies: AdminCurrencyConfig[] = [
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
        { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
        { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
        { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
        { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    ];

    private currencySubject = new BehaviorSubject<AdminCurrencyConfig>(this.currencies[0]);
    public currency$ = this.currencySubject.asObservable();

    constructor() {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            const match = this.currencies.find(c => c.code === saved);
            if (match) {
                this.currencySubject.next(match);
            }
        }
    }

    getCurrencyConfig(): AdminCurrencyConfig {
        return this.currencySubject.value;
    }

    getCurrencyCode(): string {
        return this.currencySubject.value.code;
    }

    setCurrency(code: string): void {
        const match = this.currencies.find(c => c.code === code);
        if (match) {
            this.currencySubject.next(match);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.STORAGE_KEY, code);
            }
        }
    }

    /** Format a number with the admin's chosen currency symbol */
    format(value: number): string {
        const symbol = this.currencySubject.value.symbol;
        return symbol + Math.abs(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}
