import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', duration = 5000) {
    const id = this.nextId++;
    const toast: Toast = { id, message, type, duration };
    this.toasts.update((t) => [...t, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration ?? 6000);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration ?? 6000);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  dismiss(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
