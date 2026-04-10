import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private themeService = inject(ThemeService);

  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  rememberMe: boolean = false;

  // Validation error messages
  emailError: string = '';
  passwordError: string = '';

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  validateEmail(): boolean {
    if (!this.email) {
      this.emailError = 'Email is required';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'Please enter a valid email address';
      return false;
    }

    this.emailError = '';
    return true;
  }

  validatePassword(): boolean {
    if (!this.password) {
      this.passwordError = 'Password is required';
      return false;
    }

    if (this.password.length < 6) {
      this.passwordError = 'Password must be at least 6 characters';
      return false;
    }

    this.passwordError = '';
    return true;
  }

  onEmailBlur() {
    this.validateEmail();
  }

  onPasswordBlur() {
    this.validatePassword();
  }

  onLogin() {
    // Clear previous errors
    this.emailError = '';
    this.passwordError = '';

    // Validate form
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      this.toastr.error('Please fix the errors in the form', 'Validation Error');
      return;
    }

    this.isLoading = true;

    const user = {
      email: this.email,
      password: this.password
    };

    this.authService.login(user).subscribe({
      next: (res) => {
        console.log('Login Response:', res);
        this.toastr.success('Login successful!', 'Success');

        // Dynamic redirect based on role
        const targetRoute = res.role === 'admin' ? '/admin' : '/dashboard';

        console.log('Navigating to:', targetRoute);
        this.router.navigate([targetRoute]).then(success => {
          console.log('Navigation result:', success);
          if (!success) {
            console.error('Navigation failed!');
          }
          this.isLoading = false;
        });
      },
      error: (err) => {
        console.error('Login Error:', err);
        const errorMsg = err.error?.message || 'Login failed';
        this.toastr.error(errorMsg, 'Error');
        this.isLoading = false;
      }
    });
  }
}
