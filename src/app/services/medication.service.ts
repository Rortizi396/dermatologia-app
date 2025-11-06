import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MedicationService {
  private apiUrl = (window as any).__env?.apiUrl || '/api';
  private storageKey = 'med_catalog_local';

  constructor(private http: HttpClient) {}

  // Buscar sugerencias desde backend, con fallback a localStorage
  search(q: string, limit: number = 10): Observable<any> {
    const url = `${this.apiUrl}/medicamentos?q=${encodeURIComponent(q)}&limit=${limit}`;
    return this.http.get(url).pipe(
      catchError(() => {
        const local = this.readLocal();
        const m = (local || []).filter((n: string) => n.toLowerCase().includes(q.toLowerCase())).slice(0, limit);
        return of({ success: true, data: m.map(nombre => ({ nombre })) });
      })
    );
  }

  // Agregar un medicamento al catálogo de sugerencias
  add(nombre: string): Observable<any> {
    const url = `${this.apiUrl}/medicamentos`;
    return this.http.post(url, { nombre }).pipe(
      catchError(() => {
        const set = new Set(this.readLocal());
        set.add(nombre);
        this.writeLocal(Array.from(set.values()));
        return of({ success: true });
      })
    );
  }

  private readLocal(): string[] {
    try { const raw = localStorage.getItem(this.storageKey); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  private writeLocal(list: string[]): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify(list)); } catch {}
  }
}
