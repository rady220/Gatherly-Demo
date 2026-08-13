import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { PasswordInputComponent } from '../../shared/password-input.component';
import { isImageSrc, nameInitials } from '../../core/utils/avatar';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

@Component({
  imports: [ReactiveFormsModule, PasswordInputComponent],
  template: `<header class="page-head">
      <div>
        <span class="eyebrow">Account</span>
        <h1>Your profile</h1>
      </div>
    </header>
    <section class="card profile">
      <div class="photo-wrap">
        <div class="avatar-box">
          @if (avatar()) {
            <img class="avatar large photo" [src]="avatar()!" [alt]="user()?.name" />
          } @else if (isImageSrc(user()?.avatar)) {
            <img class="avatar large photo" [src]="user()?.avatar" [alt]="user()?.name" />
          } @else {
            <span class="avatar large">{{ nameInitials(user()?.name) }}</span>
          }
          <label class="photo-edit" title="Change photo">
            <input #avatarInput type="file" accept="image/*" (change)="onFileSelected($event)" [disabled]="avatarSaving()" />
            @if (avatarSaving()) {
              <span class="spinner"></span>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            }
          </label>
        </div>
      </div>
      @if (avatarError()) {
        <p class="avatar-error">{{ avatarError() }}</p>
      }
      <h2>{{ user()?.name }}</h2>
      <p>{{ user()?.email }}</p>
      <span class="role">{{ user()?.role }}</span>
      @if (user()?.organization) {
        <p class="org">{{ user()?.organization }}</p>
      }
      @if (user()?.bio) {
        <p class="bio">{{ user()?.bio }}</p>
      }
    </section>
    <section class="card details">
      <div class="cp-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <div>
          <h2>Personal details</h2>
          <p>Keep your profile information up to date.</p>
        </div>
      </div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <label>Full name
          <input formControlName="name" type="text" required />
          @if (form.controls.name.touched && form.controls.name.errors?.['required']) {
            <span class="error">Name is required</span>
          }
        </label>
        <label>Organization
          <input formControlName="organization" type="text" placeholder="e.g. Acme Corp" />
          @if (form.controls.organization.errors?.['maxlength']) {
            <span class="error">Organization must be 200 characters or less</span>
          }
        </label>
        <label>Bio
          <textarea formControlName="bio" rows="3" placeholder="Tell people a little about yourself"></textarea>
          <span class="count">{{ form.controls.bio.value.length }}/500</span>
          @if (form.controls.bio.errors?.['maxlength']) {
            <span class="error">Bio must be 500 characters or less</span>
          }
        </label>
        @if (saveError()) {
          <div class="alert">{{ saveError() }}</div>
        }
        <button class="btn primary" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Saving…' : 'Save changes' }}
        </button>
      </form>
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
    .details,
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
    .details form,
    .change-password form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      max-width: 420px;
    }
    .details label,
    .change-password label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--ink, #17152b);
    }
    .details input,
    .details textarea,
    .change-password input {
      padding: 0.7rem 0.9rem;
      border: 1px solid var(--line, #e8e5f0);
      border-radius: 10px;
      font-size: 0.9rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      font: inherit;
      width: 100%;
      background: #fff;
    }
    .details textarea {
      resize: vertical;
      min-height: 90px;
    }
    .details input:focus,
    .details textarea:focus,
    .change-password input:focus {
      outline: none;
      border-color: var(--brand, #6d5dfc);
      box-shadow: 0 0 0 3px var(--mint, #e9e6ff);
    }
    .error {
      color: #9c303a;
      font-size: 0.78rem;
      font-weight: 500;
    }
    .count {
      color: var(--muted, #6e6b80);
      font-size: 0.72rem;
      align-self: flex-end;
    }
    .details .btn,
    .change-password .btn {
      margin-top: 0.5rem;
    }
    .org {
      margin: 0.6rem 0 0;
      font-weight: 700;
    }
    .bio {
      margin: 0.4rem auto 0;
      max-width: 420px;
      font-size: 0.9rem;
    }
    .avatar.photo {
      border-radius: 50%;
      object-fit: cover;
    }
    .photo-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.8rem;
    }
    .avatar-box {
      position: relative;
      width: max-content;
      margin: 0 auto;
    }
    .avatar-box .avatar {
      margin: 0;
    }
    .photo-edit {
      position: absolute;
      right: -2px;
      bottom: -2px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--brand, #6d5dfc);
      color: #fff;
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: background 0.15s, transform 0.15s;
    }
    .photo-edit:hover {
      background: var(--brand-dark, #5545df);
      transform: scale(1.08);
    }
    .photo-edit:has(input:disabled) {
      opacity: 0.7;
      cursor: progress;
    }
    .photo-edit input {
      display: none;
    }
    .photo-edit svg {
      width: 16px;
      height: 16px;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .avatar-error {
      color: #9c303a;
      font-size: 0.78rem;
      font-weight: 500;
      margin: 0.5rem auto 0;
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
  readonly user = this.auth.user;
  readonly isImageSrc = isImageSrc;
  readonly nameInitials = nameInitials;

  saving = signal(false);
  saveError = signal('');
  avatar = signal<string | null>(null);
  avatarSaving = signal(false);
  avatarError = signal('');

  form = new FormGroup({
    name: new FormControl(this.user()?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    bio: new FormControl(this.user()?.bio ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    organization: new FormControl(this.user()?.organization ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
  });

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.avatarError.set('');
    if (!file.type.startsWith('image/')) {
      this.avatarError.set('Please choose an image file');
      input.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      this.avatarError.set('Image must be 2MB or smaller');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.avatar.set(String(reader.result));
      this.uploadAvatar();
    };
    reader.readAsDataURL(file);
  }

  uploadAvatar() {
    if (!this.avatar()) return;
    this.avatarSaving.set(true);
    this.avatarError.set('');
    this.auth.updateProfile({ avatar: this.avatar()! }).subscribe({
      next: () => {
        this.avatarSaving.set(false);
        this.avatar.set(null);
        this.toast.success('Photo updated!');
      },
      error: (e) => {
        this.avatarSaving.set(false);
        this.avatar.set(null);
        this.avatarError.set(e.error?.message ?? 'Failed to upload photo');
      },
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saveError.set('');
    const raw = this.form.getRawValue();
    const trim = (v: string) => v.trim();
    this.auth
      .updateProfile({
        name: trim(raw.name),
        bio: trim(raw.bio) ? trim(raw.bio) : null,
        organization: trim(raw.organization) ? trim(raw.organization) : null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Profile updated!');
        },
        error: (e) => {
          this.saving.set(false);
          this.saveError.set(e.error?.message ?? 'Failed to save profile');
        },
      });
  }

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
