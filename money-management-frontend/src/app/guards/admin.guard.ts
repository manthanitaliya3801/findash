import { inject } from '@angular/core';
import {
    CanActivateFn,
    Router,
    UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn() && authService.isAdmin()) {
        return true;
    }

    // Redirect to dashboard if logged in but not admin, or login if not logged in
    if (authService.isLoggedIn()) {
        return router.createUrlTree(['/dashboard']);
    }

    return router.createUrlTree(['/login']);
};
