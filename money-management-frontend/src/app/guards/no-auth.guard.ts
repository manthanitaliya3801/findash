import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

/**
 * Prevents already-authenticated users from accessing login/register pages.
 * Redirects admins to /admin/dashboard and regular users to /dashboard.
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) {
        return true;
    }

    if (authService.isLoggedIn()) {
        // Redirect to appropriate dashboard based on role
        const targetRoute = authService.isAdmin() ? '/admin/dashboard' : '/dashboard';
        return router.createUrlTree([targetRoute]);
    }

    return true;
};
