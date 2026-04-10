import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CurrencyService } from '../services/currency.service';

@Pipe({
    name: 'appCurrency',
    standalone: true,
    pure: false // Make it impure so it updates when currency changes
})
export class AppCurrencyPipe implements PipeTransform {
    private currencyService = inject(CurrencyService);
    private currencyPipe = new CurrencyPipe('en-US');

    transform(value: number | string | null | undefined, display: 'code' | 'symbol' | 'symbol-narrow' = 'symbol'): string | null {
        const currencyCode = this.currencyService.getCurrency();
        return this.currencyPipe.transform(value, currencyCode, display);
    }
}
