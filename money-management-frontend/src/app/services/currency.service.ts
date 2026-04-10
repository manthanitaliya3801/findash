import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CurrencyConfig {
    code: string;
    symbol: string;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class CurrencyService {
    private currencySubject = new BehaviorSubject<string>('USD');
    public currency$ = this.currencySubject.asObservable();

    private currencies: { [key: string]: CurrencyConfig } = {
        'USD': { code: 'USD', symbol: '$', name: 'US Dollar' },
        'EUR': { code: 'EUR', symbol: '€', name: 'Euro' },
        'GBP': { code: 'GBP', symbol: '£', name: 'British Pound' },
        'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        'AUD': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
        'CAD': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
        'CHF': { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
        'CNY': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
        'AED': { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    };

    constructor() {
        // Load from localStorage
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('currency');
            if (saved && this.currencies[saved]) {
                this.currencySubject.next(saved);
            }
        }
    }

    setCurrency(currencyCode: string) {
        if (this.currencies[currencyCode]) {
            this.currencySubject.next(currencyCode);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('currency', currencyCode);
            }
        }
    }

    getCurrency(): string {
        return this.currencySubject.value;
    }

    getCurrencyConfig(code: string): CurrencyConfig | undefined {
        return this.currencies[code];
    }

    getCurrentCurrencyConfig(): CurrencyConfig {
        return this.currencies[this.getCurrency()] || this.currencies['USD'];
    }
}
