import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { isImageSrc, nameInitials } from '../core/utils/avatar';
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="app-shell" [class.nav-open]="open()">
    <aside class="sidebar">
      <a class="brand" routerLink="/"><span class="brand-mark">G</span><span>Gatherly</span></a>
      <nav>
        <p class="nav-label">Conference hub</p>
        <a routerLink="/dashboard" routerLinkActive="active"><span>⌂</span>Overview</a
        ><a routerLink="/conferences" routerLinkActive="active"><span>◈</span>Conferences</a>
        @if (auth.hasRole('ADMIN')) {
          <p class="nav-label">Platform</p>
          <a routerLink="/admin" routerLinkActive="active"><span>♙</span>People</a>
        }
      </nav>
      <div class="sidebar-user">
        @if (isImageSrc(auth.user()?.avatar)) {
          <img class="avatar photo" [src]="auth.user()?.avatar" [alt]="auth.user()?.name" />
        } @else {
          <span class="avatar">{{ nameInitials(auth.user()?.name) }}</span>
        }
        <div>
          <strong>{{ auth.user()?.name }}</strong
          ><small>{{ auth.user()?.role }}</small>
        </div>
        <button class="icon-btn" (click)="auth.logout()" title="Sign out">↗</button>
      </div>
    </aside>
    <main>
      <header class="topbar">
        <button class="icon-btn menu" (click)="open.set(!open())">☰</button>
        <div>
          <span class="eyebrow">Your event workspace</span
          ><strong>{{ auth.user()?.name?.split(' ')?.[0] }}</strong>
        </div>
        @if (isImageSrc(auth.user()?.avatar)) {
          <img class="avatar photo" [src]="auth.user()?.avatar" [alt]="auth.user()?.name" />
        } @else {
          <a class="avatar" routerLink="/profile">{{ nameInitials(auth.user()?.name) }}</a>
        }
      </header>
      <div class="page"><router-outlet /></div>
    </main>
  </div>`,
})
export class Shell {
  auth = inject(AuthService);
  open = signal(false);
  isImageSrc = isImageSrc;
  nameInitials = nameInitials;
}
