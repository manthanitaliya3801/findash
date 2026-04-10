import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private apiUrl = environment.apiUrl + '/auth';

    constructor() { }

    /** Reactive signal — stays in sync with localStorage so computed() works correctly */
    private userSignal = signal<any | null>(this.getUser());
    currentUser = this.userSignal.asReadonly();

    register(userData: any): Observable<any> {
        return this.http.post(this.apiUrl + '/register', userData);
    }

    getProfile(): Observable<any> {
        const token = this.getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.get(this.apiUrl + '/profile', { headers });
    }

    updateProfile(user: any): Observable<any> {
        const token = this.getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.put(this.apiUrl + '/profile', user, { headers }).pipe(
            tap((res: any) => {
                if (res && res.token) {
                    this.saveToken(res.token);
                    this.saveUser(res);
                }
            })
        );
    }

    login(userData: any): Observable<any> {
        return this.http.post(this.apiUrl + '/login', userData).pipe(
            tap((res: any) => {
                if (res && res.token) {
                    this.saveToken(res.token);
                    this.saveUser(res);
                }
            })
        );
    }

    saveToken(token: string) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    saveUser(user: any) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
        }
        this.userSignal.set(user); // keep signal in sync
    }

    getToken(): string | null {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    getUser(): any | null {
        if (typeof localStorage !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                return JSON.parse(userStr);
            }
        }
        return null;
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    isAdmin(): boolean {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    logout() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        this.userSignal.set(null); // clear signal so isAdmin reacts immediately
        this.router.navigate(['/login']);
    }
}
