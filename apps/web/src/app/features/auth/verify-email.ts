import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  imports: [RouterLink],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Email verification</span>
        <h1>Almost<br /><em>there.</em></h1>
        <p>
          Verify your email address to unlock conference registration and build your personal
          agenda.
        </p>
      </div>
    </section>
    <section class="auth-form">
      <div class="verify-card">
        @if (verifying()) {
          <div class="verify-status">
            <span class="spinner"></span>
            <h2>Verifying your email…</h2>
          </div>
        } @else if (success()) {
          <div class="verify-status success">
            <span class="icon">✓</span>
            <h2>Email verified!</h2>
            <p>Your account is now fully active. You can register for conferences.</p>
            <a routerLink="/dashboard" class="btn primary full">Go to Dashboard</a>
          </div>
        } @else if (error()) {
          <div class="verify-status error">
            <span class="icon">✗</span>
            <h2>Verification failed</h2>
            <p>{{ error() }}</p>
            @if (canResend()) {
              <button class="btn primary full" (click)="resend()" [disabled]="resending()">
                {{ resending() ? 'Sending…' : 'Resend verification email' }}
              </button>
              @if (resendSuccess()) {
                <div class="alert-success">New verification link sent! Check your email.</div>
              }
            }
            <a routerLink="/login" class="btn outline full">Back to login</a>
          </div>
        } @else {
          <div class="verify-status">
            <h2>Check your email</h2>
            <p>We sent a verification link to <strong>{{ userEmail() }}</strong>.</p>
            <p>Click the link in the email to activate your account.</p>
            @if (verificationLink()) {
              <p class="demo-note">🔗 Demo: <a [href]="verificationLink()">Click here to verify</a></p>
            }
            <button class="btn primary full" (click)="resend()" [disabled]="resending()">
              {{ resending() ? 'Sending…' : 'Resend verification email' }}
            </button>
            @if (resendSuccess()) {
              <div class="alert-success">New verification link sent!</div>
              @if (verificationLink()) {
                <p class="demo-note">🔗 Demo: <a [href]="verificationLink()">Click new link to verify</a></p>
              }
            }
            <a routerLink="/dashboard" class="btn outline full">Continue to Dashboard</a>
          </div>
        }
      </div>
    </section>
  </main>`,
  styles: [`
    .verify-card { width: min(430px, 100%); }
    .verify-status { text-align: center; padding: 2rem 0; }
    .verify-status h2 { margin: 1rem 0 0.5rem; }
    .verify-status p { color: #666; margin-bottom: 1.5rem; }
    .verify-status .icon { font-size: 3rem; display: block; }
    .verify-status.success .icon { color: #16856b; }
    .verify-status.error .icon { color: #c0392b; }
    .btn.outline { background: transparent; border: 1px solid var(--line, #ddd); margin-top: 0.75rem; }
    .alert-success { background: #e8f8f0; color: #16856b; padding: 0.7rem; border-radius: 8px; margin: 1rem 0; }
    .spinner { display: inline-block; width: 2rem; height: 2rem; border: 3px solid #eee; border-top-color: #6d5dfc; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .demo-note { background: #fff8e6; border: 1px solid #f0c36d; color: #7a5c00; padding: 0.7rem 1rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem; }
    .demo-note a { color: #6d5dfc; font-weight: 600; text-decoration: underline; }
  `],
})
export class VerifyEmail implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  verifying = signal(false);
  success = signal(false);
  error = signal('');
  canResend = signal(false);
  resending = signal(false);
  resendSuccess = signal(false);
  userEmail = signal(this.auth.user()?.email ?? '');
  verificationLink = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.verifying.set(true);
      this.auth.verifyEmail(token).subscribe({
        next: () => {
          this.verifying.set(false);
          this.success.set(true);
        },
        error: (e) => {
          this.verifying.set(false);
          this.error.set(e.error?.message ?? 'Verification failed');
          this.canResend.set(true);
        },
      });
    } else {
      // No token in URL — show the "check your email" state with a demo link
      const storedToken = localStorage.getItem('tf_verification_token');
      if (storedToken) {
        this.verificationLink.set(`/verify-email?token=${storedToken}`);
      }
    }
  }

  resend() {
    this.resending.set(true);
    this.resendSuccess.set(false);
    this.auth.resendVerification().subscribe({
      next: (res) => {
        this.resending.set(false);
        this.resendSuccess.set(true);
        if (res.verificationToken) {
          this.verificationLink.set(`/verify-email?token=${res.verificationToken}`);
        }
      },
      error: (e) => {
        this.resending.set(false);
        this.error.set(e.error?.message ?? 'Could not resend verification');
      },
    });
  }
}
