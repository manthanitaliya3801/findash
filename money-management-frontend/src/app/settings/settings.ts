import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CurrencyService } from '../services/currency.service';
import { ThemeService } from '../services/theme.service';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CategoryManager } from '../components/category-manager/category-manager.component';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, CategoryManager],
    templateUrl: './settings.html',
    styleUrls: ['./settings.css']
})
export class Settings {
    private authService = inject(AuthService);
    private currencyService = inject(CurrencyService);
    private themeService = inject(ThemeService);
    private toastr = inject(ToastrService);

    userName: string = 'Loading...';
    userEmail: string = 'Loading...';
    currency: string = 'USD';
    notifications: boolean = true;

    // Use a getter/setter for darkMode to sync with service
    get darkMode(): boolean {
        return this.themeService.isDark();
    }

    set darkMode(value: boolean) {
        this.themeService.setDarkMode(value);
        this.autoSaveTheme();
    }

    // Category Manager State
    showCategoryManager: boolean = false;
    activeCategoryType: 'income' | 'expense' = 'income';

    constructor() {
        this.currency = this.currencyService.getCurrency();
        this.loadLocalProfile();
        this.fetchProfile();
    }

    loadLocalProfile() {
        const user = this.authService.getUser();
        if (user) {
            this.userName = user.name;
            this.userEmail = user.email;
            if (user.preferences) {
                this.currency = user.preferences.currency || 'USD';
                this.notifications = user.preferences.notifications !== undefined ? user.preferences.notifications : true;
                // Theme is now handled by ThemeService init
            }
        }
    }

    fetchProfile() {
        if (!this.authService.getToken()) return;

        this.authService.getProfile().subscribe({
            next: (data: any) => {
                this.userName = data.name;
                this.userEmail = data.email;

                if (data.preferences) {
                    this.currency = data.preferences.currency || 'USD';
                    this.notifications = data.preferences.notifications !== undefined ? data.preferences.notifications : true;
                    // Sync service with backend preference if needed, but local usually wins for theme
                    if (data.preferences.theme) {
                        // Optional: could sync here if we want backend to override local
                        // this.themeService.setDarkMode(data.preferences.theme === 'dark');
                    }
                }

                // Update local storage
                const currentUser = this.authService.getUser() || {};
                this.authService.saveUser({ ...currentUser, ...data });
            },
            error: (err) => {
                console.error('Failed to fetch profile', err);
            }
        });
    }

    autoSaveTheme() {
        if (!this.authService.getToken()) return;

        // Safety check: Don't save if profile isn't loaded yet
        if (this.userName === 'Loading...' || this.userEmail === 'Loading...') {
            return;
        }

        const preferences = {
            currency: this.currency,
            notifications: this.notifications,
            theme: this.darkMode ? 'dark' : 'light'
        };

        const updatedUser = {
            name: this.userName,
            email: this.userEmail,
            preferences: preferences
        };

        this.authService.updateProfile(updatedUser).subscribe({
            next: (res) => {
                this.authService.saveUser(res);
            },
            error: (err) => console.warn('Failed to sync theme', err)
        });
    }

    openCategoryManager(type: 'income' | 'expense') {
        this.activeCategoryType = type;
        this.showCategoryManager = true;
    }

    closeCategoryManager() {
        this.showCategoryManager = false;
    }

    cancelChanges() {
        this.fetchProfile(); // Reload from server
        this.toastr.info('Changes discarded', 'Info');
    }

    saveSettings() {
        const updatedUser = {
            name: this.userName,
            email: this.userEmail,
            preferences: {
                currency: this.currency,
                notifications: this.notifications,
                theme: this.darkMode ? 'dark' : 'light'
            }
        };

        this.currencyService.setCurrency(this.currency);

        this.authService.updateProfile(updatedUser).subscribe({
            next: (res) => {
                this.toastr.success('Settings saved successfully!', 'Success');
                this.authService.saveUser(res);
            },
            error: (err) => {
                console.error(err);
                this.toastr.error('Failed to save settings', 'Error');
            }
        });
    }

    logout() {
        this.authService.logout();
    }
}
