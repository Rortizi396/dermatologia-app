import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, shareReplay, catchError } from 'rxjs';

export interface Doctor {
  idDoctores?: number;
  Nombres?: string; nombres?: string;
  Apellidos?: string; apellidos?: string;
  Correo?: string; correo?: string;
  Colegiado?: string; colegiado?: string;
  Activo?: string; activo?: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private cache$?: Observable<Doctor[]>;
  private readonly base = ((window as any).__env?.apiUrl || '/api');

  constructor(private http: HttpClient) {}

  list(): Observable<Doctor[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<any>(`${this.base}/doctores`).pipe(
        map(res => (res?.data ?? res ?? []) as Doctor[]),
        catchError(() => of([] as Doctor[])),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  findByEmailOrName(email?: string, fullName?: string): Observable<Doctor | null> {
    return this.list().pipe(
      map(list => {
        if (!list || list.length === 0) return null;
        const norm = (s?: string) => (s || '').toString().trim().toLowerCase();
        const e = norm(email);
        const n = norm(fullName);
        // Try by correo
        let doc = list.find(d => norm(d.Correo || d.correo) === e);
        if (doc) return doc;
        // Try by full name
        if (n) {
          doc = list.find(d => `${norm(d.Nombres||d.nombres)} ${norm(d.Apellidos||d.apellidos)}`.trim() === n);
          if (doc) return doc;
        }
        return null;
      })
    );
  }
}
