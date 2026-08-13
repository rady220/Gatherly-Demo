import { Component, Input, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="password-field">
      <input
        [formControl]="control"
        [type]="visible() ? 'text' : 'password'"
        [placeholder]="placeholder"
      />
      <button type="button" class="eye-toggle" (click)="visible.set(!visible())" tabindex="-1" [attr.aria-label]="visible() ? 'Hide password' : 'Show password'">
        @if (visible()) {
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        }
      </button>
    </div>
  `,
  styles: [`
    .password-field {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-field input {
      width: 100%;
      padding-right: 2.8rem;
    }
    .eye-toggle {
      position: absolute;
      right: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: var(--muted, #6e6b80);
      cursor: pointer;
      padding: 0.3rem;
      display: grid;
      place-items: center;
      border-radius: 4px;
      transition: color 0.2s;
    }
    .eye-toggle:hover {
      color: var(--ink, #17152b);
    }
  `],
})
export class PasswordInputComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() placeholder = '';
  visible = signal(false);
}
