import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
    // Auth pages (redirect away if already logged in)
    { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login), canActivate: [noAuthGuard] },
    { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register), canActivate: [noAuthGuard] },

    // User pages (require authentication)
    { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard), canActivate: [authGuard] },
    { path: 'income', loadComponent: () => import('./income/income').then(m => m.Income), canActivate: [authGuard] },
    { path: 'expenses', loadComponent: () => import('./expenses/expenses').then(m => m.Expenses), canActivate: [authGuard] },
    { path: 'budget', loadComponent: () => import('./budget/budget').then(m => m.Budget), canActivate: [authGuard] },
    { path: 'savings', loadComponent: () => import('./savings/savings').then(m => m.Savings), canActivate: [authGuard] },
    { path: 'reports', loadComponent: () => import('./reports/reports').then(m => m.Reports), canActivate: [authGuard] },
    { path: 'settings', loadComponent: () => import('./settings/settings').then(m => m.Settings), canActivate: [authGuard] },

    // Admin section (require admin role)
    {
        path: 'admin',
        loadComponent: () => import('./admin/layout/admin-layout').then(m => m.AdminLayout),
        canActivate: [adminGuard],
        children: [
            { path: 'dashboard', loadComponent: () => import('./admin/dashboard/admin-dashboard').then(m => m.AdminDashboard) },
            { path: 'users', loadComponent: () => import('./admin/users/users').then(m => m.AdminUsers) },
            { path: 'reports', loadComponent: () => import('./admin/reports/reports').then(m => m.AdminReports) },
            { path: 'transactions', loadComponent: () => import('./admin/transactions/transactions').then(m => m.AdminTransactions) },
            { path: 'settings', loadComponent: () => import('./admin/settings/admin-settings').then(m => m.AdminSettings) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },

    // Default redirect
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
