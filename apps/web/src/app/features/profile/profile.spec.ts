import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Profile } from './profile';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/models';

const baseUser: User = {
  id: 1,
  name: 'Nour Adel',
  email: 'attendee@gatherly.dev',
  role: 'ATTENDEE',
  avatar: 'NA',
  active: true,
  isVerified: true,
  bio: 'Conference lover',
  organization: 'Acme Corp',
};

class AuthStub {
  user = signal<User>(baseUser);
  updateProfile(data: Partial<User>) {
    this.user.set({ ...this.user(), ...data });
    return of(this.user());
  }
}

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let auth: AuthStub;

  beforeEach(async () => {
    auth = new AuthStub();
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows name, email, and role', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Nour Adel');
    expect(text).toContain('attendee@gatherly.dev');
    expect(text).toContain('ATTENDEE');
  });

  it('populates the edit form from the current user', () => {
    expect(component.form.controls.name.value).toBe('Nour Adel');
    expect(component.form.controls.bio.value).toBe('Conference lover');
    expect(component.form.controls.organization.value).toBe('Acme Corp');
  });

  it('updates the displayed profile after saving', () => {
    component.form.controls.name.setValue('New Name');
    component.save();
    fixture.detectChanges();
    expect(auth.user().name).toBe('New Name');
    expect(fixture.nativeElement.textContent).toContain('New Name');
  });

  it('renders name initials when the avatar is not a URL', () => {
    expect(fixture.nativeElement.textContent).toContain('NA');
  });

  it('renders an image when the avatar is a URL', () => {
    auth.user.set({ ...baseUser, avatar: 'https://example.com/photo.png' });
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img.avatar');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/photo.png');
  });

  it('previews a newly selected base64 photo before saving', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    component.avatar.set(data);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img.avatar');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(data);
  });

  it('auto-saves the selected photo immediately', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    component.avatar.set(data);
    const spy = vi.spyOn(auth, 'updateProfile');
    component.uploadAvatar();
    expect(spy).toHaveBeenCalledWith({ avatar: data });
    expect(auth.user().avatar).toBe(data);
    expect(component.avatar()).toBeNull();
  });

  it('auto-saves an image file on selection', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const orig = globalThis.FileReader;
    class MockReader {
      onload: (() => void) | null = null;
      result = data;
      readAsDataURL() {
        this.onload?.();
      }
    }
    (globalThis as any).FileReader = MockReader;
    try {
      const spy = vi.spyOn(auth, 'updateProfile');
      component.onFileSelected({
        target: { files: [file], value: '' },
      } as unknown as Event);
      expect(spy).toHaveBeenCalledWith({ avatar: data });
      expect(auth.user().avatar).toBe(data);
    } finally {
      (globalThis as any).FileReader = orig;
    }
  });

  it('reports a failed photo upload', () => {
    component.avatar.set('data:image/png;base64,iVBORw0KGgo=');
    vi.spyOn(auth, 'updateProfile').mockReturnValue(
      throwError(() => ({ error: { message: 'Upload failed' } })),
    );
    component.uploadAvatar();
    expect(component.avatarError()).toContain('Upload failed');
    expect(component.avatar()).toBeNull();
  });

  it('rejects a non-image file selection', () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    component.onFileSelected({
      target: { files: [file], value: '' },
    } as unknown as Event);
    expect(component.avatarError()).toContain('image');
    expect(component.avatar()).toBeNull();
  });

  it('clears optional fields when left blank', () => {
    const spy = vi.spyOn(auth, 'updateProfile');
    component.form.controls.bio.setValue('   ');
    component.save();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ bio: null }));
    expect(spy).toHaveBeenCalledWith(expect.not.objectContaining({ avatar: expect.anything() }));
  });
});
