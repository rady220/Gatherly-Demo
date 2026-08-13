import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Account recovery</span>
        <h1>Forgot your<br /><em>password?</em></h1>
        <p>
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
    </section>
    <section class="auth-form">
      @if (!sent()) {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <span class="eyebrow">Password reset</span>
          <h2>Reset your password</h2>
          <p>Enter the email associated with your account.</p>
          <label>Email<input formControlName="email" type="email" placeholder="you@example.com" /></label>
          @if (error()) {
            <div class="alert">{{ error() }}</div>
          }
          <button class="btn primary full" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Sending…' : 'Send reset link' }}
          </button>
          <p class="auth-switch">Remember your password? <a routerLink="/login">Sign in</a></p>
        </form>
      } @else {
        <div class="reset-sent">
          <span class="icon">✉</span>
          <h2>Check your email</h2>
          <p>If an account exists for <strong>{{ form.value.email }}</strong>, we've sent a password reset link.</p>
          @if (resetLink()) {
            <p class="demo-note">🔗 Demo: <a [href]="resetLink()">Click here to reset password</a></p>
          }
          <a routerLink="/login" class="btn primary full">Back to login</a>
        </div>
      }
    </section>
  </main>`,
  styles: [`
    .reset-sent { text-align: center; padding: 2rem 0; width: min(430px, 100%); }
    .reset-sent .icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    .reset-sent h2 { margin-bottom: 0.5rem; }
    .reset-sent p { color: #666; margin-bottom: 1.5rem; }
    .demo-note { background: #fff8e6; border: 1px solid #f0c36d; color: #7a5c00; padding: 0.7rem 1rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem; }
    .demo-note a { color: #6d5dfc; font-weight: 600; text-decoration: underline; }
  `],
})
export class ForgotPassword {
  private http = inject(HttpClient);
  loading = signal(false);
  error = signal('');
  sent = signal(false);
  resetLink = signal('');

  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.http.post<any>('http://localhost:3000/api/auth/forgot-password', { email: this.form.value.email }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.resetToken) {
          this.sent.set(true);
          this.resetLink.set(`/reset-password?token=${res.resetToken}`);
        } else {
          this.error.set('No account found with this email address. Please check and try again, or create a new account.');
        }
      },
      error: (e) => {
        this.error.set(e.error?.message ?? 'Something went wrong');
        this.loading.set(false);
      },
    });
  }
}
