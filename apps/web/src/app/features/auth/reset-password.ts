import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PasswordInputComponent } from '../../shared/password-input.component';

@Component({
  imports: [ReactiveFormsModule, RouterLink, PasswordInputComponent],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Account recovery</span>
        <h1>Set a new<br /><em>password.</em></h1>
        <p>
          Choose a strong password to secure your account.
        </p>
      </div>
    </section>
    <section class="auth-form">
      @if (success()) {
        <div class="reset-success">
          <span class="icon">✓</span>
          <h2>Password reset!</h2>
          <p>Your password has been updated successfully. You can now sign in.</p>
          <a routerLink="/login" class="btn primary full">Sign in</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <span class="eyebrow">New password</span>
          <h2>Reset your password</h2>
          <p>Enter your new password below.</p>
          <label>New password
            <app-password-input [control]="form.controls.newPassword" placeholder="Min. 8 characters" />
          </label>
          <label>Confirm password
            <app-password-input [control]="form.controls.confirmPassword" placeholder="Re-enter password" />
          </label>
          @if (error()) {
            <div class="alert">{{ error() }}</div>
          }
          <button class="btn primary full" [disabled]="form.invalid || loading() || !token()">
            {{ loading() ? 'Resetting…' : 'Reset password' }}
          </button>
          <p class="auth-switch"><a routerLink="/login">Back to sign in</a></p>
        </form>
      }
    </section>
  </main>`,
  styles: [`
    .reset-success { text-align: center; padding: 2rem 0; width: min(430px, 100%); }
    .reset-success .icon { font-size: 3rem; display: block; color: #16856b; margin-bottom: 1rem; }
    .reset-success h2 { margin-bottom: 0.5rem; }
    .reset-success p { color: #666; margin-bottom: 1.5rem; }
  `],
})
export class ResetPassword implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  success = signal(false);
  token = signal('');

  form = new FormGroup({
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.token.set(token);
    } else {
      this.error.set('No reset token provided. Please request a new password reset link.');
    }
  }

  submit() {
    if (this.form.invalid || !this.token()) return;
    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.http.post<any>('http://localhost:3000/api/auth/reset-password', {
      token: this.token(),
      newPassword,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (e) => {
        this.error.set(e.error?.message ?? 'Reset failed. The link may have expired.');
        this.loading.set(false);
      },
    });
  }
}
