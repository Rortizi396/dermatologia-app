import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error';

export interface ToastPayload {
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastPayload | null>(null);

  get toast$(): Observable<ToastPayload | null> {
    return this.toastSubject.asObservable();
  }

  show(message: string, type: ToastType = 'success', duration = 3000) {
    this.toastSubject.next({ message, type });
    setTimeout(() => this.clear(), duration);
  }

  clear() {
    this.toastSubject.next(null);
  }
}
