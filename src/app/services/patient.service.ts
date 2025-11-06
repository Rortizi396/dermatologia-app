import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Patient {
  DPI: string;
  Nombres?: string;
  Apellidos?: string;
  nombres?: string;
  apellidos?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private apiUrl = (window as any).__env?.apiUrl || '/api';

  constructor(private http: HttpClient) {}

  list(includeInactive = false): Observable<Patient[]> {
    const url = `${this.apiUrl}/pacientes${includeInactive ? '?includeInactive=1' : ''}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        return data as Patient[];
      }),
      catchError(() => of([] as Patient[]))
    );
  }
}
