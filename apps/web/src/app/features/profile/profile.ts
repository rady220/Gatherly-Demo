import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { PasswordInputComponent } from '../../shared/password-input.component';

@Component({
  imports: [ReactiveFormsModule, PasswordInputComponent],
  template: `<header class="page-head">
      <div>
        <span class="eyebrow">Account</span>
        <h1>Your profile</h1>
      </div>
    </header>
    <section class="card profile">
      <span class="avatar large">{{ auth.user()?.avatar }}</span>
      <h2>{{ auth.user()?.name }}</h2>
      <p>{{ auth.user()?.email }}</p>
      <span class="role">{{ auth.user()?.role }}</span>
    </section>
    <section class="card change-password">
      <div class="cp-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <div>
          <h2>Change password</h2>
          <p>Update your password to keep your account secure.</p>
        </div>
      </div>
      <form [formGroup]="pwForm" (ngSubmit)="changePassword()">
        <label>Current password
          <app-password-input [control]="pwForm.controls.currentPassword" placeholder="Enter current password" />
        </label>
        <label>New password
          <app-password-input [control]="pwForm.controls.newPassword" placeholder="Min. 8 characters" />
        </label>
        <label>Confirm new password
          <app-password-input [control]="pwForm.controls.confirmPassword" placeholder="Re-enter new password" />
        </label>
        @if (pwError()) {
          <div class="alert">{{ pwError() }}</div>
        }
        <button class="btn primary" [disabled]="pwForm.invalid || pwLoading()">
          {{ pwLoading() ? 'Changing…' : 'Change password' }}
        </button>
      </form>
    </section>`,
  styles: [`
    .change-password {
      margin-top: 1.5rem;
      padding: 2rem;
    }
    .cp-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .cp-header svg {
      color: var(--brand, #6d5dfc);
      flex-shrink: 0;
      margin-top: 0.15rem;
    }
    .cp-header h2 {
      margin-bottom: 0.25rem;
    }
    .cp-header p {
      color: var(--muted, #6e6b80);
      margin: 0;
      font-size: 0.9rem;
    }
    .change-password form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      max-width: 420px;
    }
    .change-password label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--ink, #17152b);
    }
    .change-password input {
      padding: 0.7rem 0.9rem;
      border: 1px solid var(--line, #e8e5f0);
      border-radius: 10px;
      font-size: 0.9rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .change-password input:focus {
      outline: none;
      border-color: var(--brand, #6d5dfc);
      box-shadow: 0 0 0 3px var(--mint, #e9e6ff);
    }
    .change-password .btn {
      margin-top: 0.5rem;
    }
    .alert {
      background: #fff0f1;
      color: #9c303a;
      padding: 0.7rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
    }
  `],
})
export class Profile {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  pwLoading = signal(false);
  pwError = signal('');

  pwForm = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  changePassword() {
    if (this.pwForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.pwForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.pwError.set('New passwords do not match');
      return;
    }
    this.pwLoading.set(true);
    this.pwError.set('');
    this.http.post<any>('http://localhost:3000/api/auth/change-password', { currentPassword, newPassword }).subscribe({
      next: () => {
        this.pwLoading.set(false);
        this.pwForm.reset();
        this.toast.success('Password changed successfully!');
      },
      error: (e) => {
        this.pwLoading.set(false);
        this.pwError.set(e.error?.message ?? 'Failed to change password');
      },
    });
  }
}
