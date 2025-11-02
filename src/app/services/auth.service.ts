// services/auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    // Prefer localStorage (remembered) and fall back to sessionStorage (non-remembered)
    const storedUserLocal = localStorage.getItem('currentUser');
    const storedUserSession = sessionStorage.getItem('currentUser');
    let user: User | null = null;
    const raw = storedUserLocal ?? storedUserSession;

    if (raw && raw !== 'undefined' && raw !== 'null') {
      try {
        user = JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing user from storage:', e);
        user = null;
      }
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User, token: string, remember: boolean = true): void {
    console.log('setCurrentUser llamado con:', { user, token });
    if (user && typeof user === 'object' && token && typeof token === 'string') {
    try {
      // Normalize role field to `tipo` and lowercase it to keep consistency.
      // Be permissive: accept `Tipo`, `TIPO`, `type` or `tipo` coming from API.
      try {
        const asAny = user as any;
        if (!asAny.tipo && (asAny.Tipo || asAny.TIPO || asAny.type)) {
          asAny.tipo = (asAny.Tipo || asAny.TIPO || asAny.type).toString().toLowerCase();
        } else if (asAny.tipo) {
          asAny.tipo = String(asAny.tipo).toLowerCase();
        }
      } catch (e) {
        console.warn('No se pudo normalizar tipo en setCurrentUser', e);
      }

      // Ensure nombres/apellidos exist so templates don't render `undefined`.
      try {
        const asAny = user as any;
        if (!asAny.nombres && (asAny.Nombres || asAny.name)) {
          asAny.nombres = asAny.Nombres || asAny.name || '';
        }
        if (!asAny.apellidos && (asAny.Apellidos || asAny.lastname || asAny.lastName)) {
          asAny.apellidos = asAny.Apellidos || asAny.lastname || asAny.lastName || '';
        }
        // If still missing, fallback to the email local-part (before @)
        if (!asAny.nombres && asAny.correo) {
          asAny.nombres = String(asAny.correo).split('@')[0] || '';
        }
      } catch (e) {
        console.warn('No se pudo normalizar nombres/apellidos en setCurrentUser', e);
      }

  // Guardar en el almacenamiento seleccionado
  const store = remember ? localStorage : sessionStorage;
  // Limpieza defensiva del otro storage para no dejar residuos
  try { (remember ? sessionStorage : localStorage).removeItem('currentUser'); } catch {}
  try { (remember ? sessionStorage : localStorage).removeItem('token'); } catch {}
  store.setItem('currentUser', JSON.stringify(user));
  store.setItem('token', token);

      // Actualizar BehaviorSubject
      this.currentUserSubject.next(user);

      console.log('Usuario y token guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar credenciales:', error);
      this.handleAuthError();
    }
  } else {
    console.error('Error: Intento de guardar usuario o token undefined');
    // Limpiar en caso de error
    this.handleAuthError();
    try { localStorage.removeItem('currentUser'); } catch {}
    try { localStorage.removeItem('token'); } catch {}
    try { sessionStorage.removeItem('currentUser'); } catch {}
    try { sessionStorage.removeItem('token'); } catch {}
    this.currentUserSubject.next(null);
  }
  }
  
  private handleAuthError(): void {
  try { localStorage.removeItem('currentUser'); } catch {}
  try { localStorage.removeItem('token'); } catch {}
  try { sessionStorage.removeItem('currentUser'); } catch {}
  try { sessionStorage.removeItem('token'); } catch {}
  this.currentUserSubject.next(null);
}

  logout(): void {
    try { localStorage.removeItem('currentUser'); } catch {}
    try { localStorage.removeItem('token'); } catch {}
    try { sessionStorage.removeItem('currentUser'); } catch {}
    try { sessionStorage.removeItem('token'); } catch {}
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    const user = this.currentUserValue;
    const token = this.getToken();
  
    // Verificar que exista usuario Y token Y token no expirado
    return user !== null && token !== null && !this.isTokenExpired();
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user !== null && user.tipo === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserValue;
    return user !== null && roles.includes(user.tipo);
  }

  getToken(): string | null {
    return localStorage.getItem('token') ?? sessionStorage.getItem('token');
  }

  // Verificar si el token está expirado (ejemplo básico)
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiration = payload.exp * 1000; // Convertir a milisegundos
      return Date.now() >= expiration;
    } catch (error) {
      return true;
    }
  }
}