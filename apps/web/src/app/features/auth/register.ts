import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PasswordInputComponent } from '../../shared/password-input.component';

@Component({
  imports: [ReactiveFormsModule, RouterLink, PasswordInputComponent],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Conference platform</span>
        <h1>Join the<br /><em>community.</em></h1>
        <p>
          Create your attendee account to discover conferences, build your personal agenda, and
          connect with speakers.
        </p>
      </div>
      <blockquote>
        "Every great conference starts with a curious attendee."
        <footer>— Gatherly principle</footer>
      </blockquote>
    </section>
    <section class="auth-form">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <span class="eyebrow">Get started</span>
        <h2>Create your account</h2>
        <p>Sign up as an attendee to explore conferences.</p>
        <label>Name<input formControlName="name" type="text" placeholder="Your full name" /></label>
        <label>Email<input formControlName="email" type="email" placeholder="you@example.com" /></label>
        <label>Password
          <app-password-input [control]="form.controls.password" placeholder="Min. 8 characters" />
        </label>
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }
        <button class="btn primary full" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Creating account…' : 'Create account' }}
        </button>
        <p class="auth-switch">Already have an account? <a routerLink="/login">Sign in</a></p>
      </form>
    </section>
  </main>`,
})
export class Register {
  private a = inject(AuthService);
  private r = inject(Router);
  loading = signal(false);
  error = signal('');
  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.a.register(this.form.value.name!, this.form.value.email!, this.form.value.password!).subscribe({
      next: () => this.r.navigateByUrl('/verify-email'),
      error: (e) => {
        this.error.set(e.error?.message ?? 'Unable to create account');
        this.loading.set(false);
      },
    });
  }
}
