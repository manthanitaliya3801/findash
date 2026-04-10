import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    // Signal to track theme state
    darkMode = signal<boolean>(false);

    constructor() {
        if (this.isBrowser) {
            // Initialize from local storage or system preference
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                this.setDarkMode(true);
            } else if (
                !savedTheme &&
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches
            ) {
                // Respect system preference if no saved theme
                this.setDarkMode(true);
            }
        }
    }

    toggleTheme() {
        this.setDarkMode(!this.darkMode());
    }

    setDarkMode(isDark: boolean) {
        this.darkMode.set(isDark);
        if (this.isBrowser) {
            if (isDark) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        }
    }

    isDark() {
        return this.darkMode();
    }
}
