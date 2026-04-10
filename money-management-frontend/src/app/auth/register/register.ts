import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private themeService = inject(ThemeService);

  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  acceptedTerms: boolean = false;

  // Password strength: 'weak' | 'medium' | 'strong'
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';

  // Validation error messages
  nameError: string = '';
  emailError: string = '';
  passwordError: string = '';
  confirmPasswordError: string = '';

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  calculatePasswordStrength() {
    if (!this.password) {
      this.passwordStrength = 'weak';
      return;
    }

    let strength = 0;

    // Length check
    if (this.password.length >= 8) strength++;
    if (this.password.length >= 12) strength++;

    // Complexity checks
    if (/[a-z]/.test(this.password)) strength++;
    if (/[A-Z]/.test(this.password)) strength++;
    if (/[0-9]/.test(this.password)) strength++;
    if (/[^a-zA-Z0-9]/.test(this.password)) strength++;

    if (strength <= 2) {
      this.passwordStrength = 'weak';
    } else if (strength <= 4) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'strong';
    }
  }

  onPasswordInput() {
    this.calculatePasswordStrength();
    if (this.confirmPassword) {
      this.validateConfirmPassword();
    }
  }

  validateName(): boolean {
    if (!this.name) {
      this.nameError = 'Name is required';
      return false;
    }

    if (this.name.length < 2) {
      this.nameError = 'Name must be at least 2 characters';
      return false;
    }

    this.nameError = '';
    return true;
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

    if (this.password.length < 8) {
      this.passwordError = 'Password must be at least 8 characters';
      return false;
    }

    if (!/[A-Z]/.test(this.password)) {
      this.passwordError = 'Password must contain an uppercase letter';
      return false;
    }

    if (!/[a-z]/.test(this.password)) {
      this.passwordError = 'Password must contain a lowercase letter';
      return false;
    }

    if (!/[0-9]/.test(this.password)) {
      this.passwordError = 'Password must contain a number';
      return false;
    }

    this.passwordError = '';
    return true;
  }

  validateConfirmPassword(): boolean {
    if (!this.confirmPassword) {
      this.confirmPasswordError = 'Please confirm your password';
      return false;
    }

    if (this.password !== this.confirmPassword) {
      this.confirmPasswordError = 'Passwords do not match';
      return false;
    }

    this.confirmPasswordError = '';
    return true;
  }

  onNameBlur() {
    this.validateName();
  }

  onEmailBlur() {
    this.validateEmail();
  }

  onPasswordBlur() {
    this.validatePassword();
  }

  onConfirmPasswordBlur() {
    this.validateConfirmPassword();
  }

  onRegister() {
    // Clear previous errors
    this.nameError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

    // Validate all fields
    const isNameValid = this.validateName();
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    const isConfirmPasswordValid = this.validateConfirmPassword();

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      this.toastr.error('Please fix the errors in the form', 'Validation Error');
      return;
    }

    if (!this.acceptedTerms) {
      this.toastr.error('Please accept the terms and conditions', 'Error');
      return;
    }

    this.isLoading = true;

    const user = {
      name: this.name,
      email: this.email,
      password: this.password
    };

    this.authService.register(user).subscribe({
      next: (res) => {
        this.toastr.success('Registration successful!', 'Success');
        // Auto login or redirect
        this.authService.saveToken(res.token);
        this.authService.saveUser(res);
        this.router.navigate(['/']); // Redirect to dashboard/home
        this.isLoading = false;
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Registration failed';
        this.toastr.error(errorMsg, 'Error');
        this.isLoading = false;
      }
    });
  }
}
