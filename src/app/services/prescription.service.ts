import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecetaItem { id?: number; cantidad: number; nombre: string; dosis: string; }
export interface Receta {
  id: number;
  fecha: string;
  doctor_nombre?: string;
  doctor_correo?: string;
  doctor_colegiado?: string;
  paciente_dpi: string;
  observaciones?: string;
  created_at?: string;
  items: RecetaItem[];
}

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private apiUrl = (window as any).__env?.apiUrl || '/api';
  constructor(private http: HttpClient) {}

  list(options: { doctor_correo?: string; doctor_colegiado?: string; paciente_dpi?: string; page?: number; limit?: number }): Observable<{ success: boolean; data: Receta[]; page: number; limit: number; total: number; }>{
    let params = new HttpParams();
    if (options.doctor_correo) params = params.set('doctor_correo', options.doctor_correo);
    if (options.doctor_colegiado) params = params.set('doctor_colegiado', options.doctor_colegiado);
    if (options.paciente_dpi) params = params.set('paciente_dpi', options.paciente_dpi);
    if (options.page) params = params.set('page', String(options.page));
    if (options.limit) params = params.set('limit', String(options.limit));
    return this.http.get<{ success: boolean; data: Receta[]; page: number; limit: number; total: number; }>(`${this.apiUrl}/recetas`, { params });
  }
}
