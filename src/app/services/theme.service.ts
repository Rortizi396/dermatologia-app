// services/theme.service.ts
import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private storageKey = 'theme';
  private current: ThemeMode = 'light';

  constructor() {
    const saved = (localStorage.getItem(this.storageKey) || '').toLowerCase();
    if (saved === 'dark' || saved === 'light') this.current = saved as ThemeMode;
    this.apply(this.current);
  }

  get theme(): ThemeMode { return this.current; }

  setTheme(mode: ThemeMode) {
    if (mode !== this.current) {
      this.current = mode;
      localStorage.setItem(this.storageKey, this.current);
      this.apply(this.current);
    }
  }

  toggle(): ThemeMode {
    const next: ThemeMode = this.current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    return next;
  }

  private apply(mode: ThemeMode) {
    try {
      const root = document.documentElement; // <html>
      root.setAttribute('data-theme', mode);
    } catch {}
  }
}
