import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../services/admin-data.service';
import { ThemeService } from '../../services/theme.service';
import { AdminCurrencyService } from '../../services/admin-currency.service';

@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-settings.html',
    styleUrls: ['./admin-settings.css']
})
export class AdminSettings implements OnInit {
    private adminDataService = inject(AdminDataService);
    public themeService = inject(ThemeService);
    public adminCurrencyService = inject(AdminCurrencyService);
    private cdr = inject(ChangeDetectorRef);

    // Password form
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    showCurrentPass = false;
    showNewPass = false;
    showConfirmPass = false;
    passwordLoading = false;
    passwordSuccess = '';
    passwordError = '';

    // Currency (admin-only — uses 'admin_currency' key, never touches user preferences)
    selectedCurrency = 'USD';
    currencySaved = false;
    get isDark(): boolean {
        return this.themeService.isDark();
    }



    get passwordStrength(): number {
        const p = this.newPassword;
        let score = 0;
        if (p.length >= 6) score++;
        if (p.length >= 10) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        return score;
    }

    get strengthLabel(): string {
        const s = this.passwordStrength;
        if (s <= 1) return 'Weak';
        if (s <= 3) return 'Medium';
        return 'Strong';
    }

    get strengthColor(): string {
        const s = this.passwordStrength;
        if (s <= 1) return '#dc2626';
        if (s <= 3) return '#f59e0b';
        return '#16a34a';
    }

    ngOnInit() {
        this.selectedCurrency = this.adminCurrencyService.getCurrencyCode();
    }

    saveCurrency() {
        this.adminCurrencyService.setCurrency(this.selectedCurrency);
        this.currencySaved = true;
        setTimeout(() => { this.currencySaved = false; this.cdr.detectChanges(); }, 2500);
    }

    toggleDarkMode() {
        this.themeService.toggleTheme();
    }



    changePassword() {
        this.passwordError = '';
        this.passwordSuccess = '';

        if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
            this.passwordError = 'All password fields are required.';
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.passwordError = 'New passwords do not match.';
            return;
        }
        if (this.newPassword.length < 6) {
            this.passwordError = 'New password must be at least 6 characters.';
            return;
        }

        this.passwordLoading = true;
        this.adminDataService.changeAdminPassword(this.currentPassword, this.newPassword).subscribe({
            next: (res) => {
                this.passwordSuccess = res?.message || 'Password changed successfully!';
                this.passwordLoading = false;
                this.currentPassword = '';
                this.newPassword = '';
                this.confirmPassword = '';
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.passwordError = err?.error?.message || 'Failed to change password. Try again.';
                this.passwordLoading = false;
                this.cdr.detectChanges();
            }
        });
    }
}
