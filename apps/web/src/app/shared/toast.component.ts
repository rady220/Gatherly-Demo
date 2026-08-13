import { Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [attr.data-type]="toast.type" (click)="toastService.dismiss(toast.id)">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error') { ✗ }
              @case ('warning') { ⚠ }
              @case ('info') { ℹ }
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      width: 100%;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
      animation: slideIn 0.3s ease-out;
      pointer-events: all;
      cursor: pointer;
      border-left: 4px solid;
      transition: opacity 0.2s, transform 0.2s;
    }
    .toast:hover {
      transform: translateX(-2px);
    }
    .toast[data-type="success"] { border-left-color: #16856b; }
    .toast[data-type="error"] { border-left-color: #c0392b; }
    .toast[data-type="warning"] { border-left-color: #e67e22; background: #fffbf0; }
    .toast[data-type="info"] { border-left-color: #6d5dfc; }
    .toast-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .toast[data-type="success"] .toast-icon { color: #16856b; }
    .toast[data-type="error"] .toast-icon { color: #c0392b; }
    .toast[data-type="warning"] .toast-icon { color: #e67e22; }
    .toast[data-type="info"] .toast-icon { color: #6d5dfc; }
    .toast-message {
      flex: 1;
      font-size: 0.9rem;
      color: #333;
      line-height: 1.4;
    }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #999;
      cursor: pointer;
      padding: 0 0.25rem;
      line-height: 1;
    }
    .toast-close:hover { color: #333; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
