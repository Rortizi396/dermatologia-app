// ...existing code...
// appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Appointment } from '../interfaces/appointment.interface';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  // Cancelar cita
  cancelAppointment(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/${id}/cancel`, {});
  }
  // Confirmar cita
  confirmAppointment(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/${id}/confirm`, {});
  }
  // Use runtime-configurable API base (falls back to '/api' for local dev)
  private apiUrl = (window as any).__env?.apiUrl || '/api';

  constructor(private http: HttpClient) { }

  createAppointment(appointmentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments`, appointmentData);
  }

  getAppointmentById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${id}`);
  }

  getAppointmentsByUser(userId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments/user/${userId}`);
  }

  checkDoctorAvailability(doctorId: number, date: string, time: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/doctors/${doctorId}/availability?date=${date}&time=${time}`);
  }

  getSpecialties(): Observable<any> {
    // Normalize backend shape to frontend-friendly shape and be resilient to multiple response formats
    return this.http.get<any>(`${this.apiUrl}/specialties`).pipe(
      tap((resp: any) => {
        try { console.log('[getSpecialties] raw resp:', resp); } catch {}
      }),
      map((resp: any) => {
        const raw: any[] = Array.isArray(resp)
          ? resp
          : (Array.isArray(resp?.specialties)
              ? resp.specialties
              : (Array.isArray(resp?.data)
                  ? resp.data
                  : (Array.isArray(resp?.rows) ? resp.rows : [])));

        const normalized = (raw || []).map((s: any) => {
          const idRaw = s.idEspecialidad ?? s.idEspecialidades ?? s.idespecialidad ?? s.idespecialidades ?? s.ID ?? s.id ?? s.Id ?? s.IdEspecialidad;
          let idNum: number | null = null;
          if (typeof idRaw === 'number') {
            idNum = Number.isFinite(idRaw) ? idRaw : null;
          } else if (typeof idRaw !== 'undefined' && idRaw !== null) {
            const parsed = parseInt(String(idRaw), 10);
            idNum = Number.isFinite(parsed) ? parsed : null;
          }
          return {
            idEspecialidades: idNum,
            Nombre: s.Nombre ?? s.nombre ?? s.NombreEspecialidad ?? s.name ?? s.especialidad ?? '',
            Descripcion: s.Descripcion ?? s.descripcion ?? s.description ?? ''
          };
        });

        // Return consistent object shape the caller expects
        const out = { specialties: normalized };
        try { console.log('[getSpecialties] normalized:', out); } catch {}
        return out;
      })
    );
  }

  getDoctorsBySpecialty(specialtyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctors/specialty/${specialtyId}`);
  }
  // Obtener todas las citas
  getCitas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas`);
  }

  // Obtener citas paginadas/filtradas
  getCitasPaged(page = 1, limit = 50, date?: string, status?: string): Observable<any> {
    const params: string[] = [];
    params.push(`page=${page}`);
    params.push(`limit=${limit}`);
    if (date) params.push(`date=${encodeURIComponent(date)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    const q = `${this.apiUrl}/citas?${params.join('&')}`;
    return this.http.get<any>(q);
  }

  getCitasByRangePaged(from: string, to: string, page = 1, limit = 50): Observable<any> {
    const params = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&limit=${limit}`;
    return this.http.get<any>(`${this.apiUrl}/citas?${params}`);
  }

  getCitasByStatusPaged(status: string, page = 1, limit = 50): Observable<any> {
    const params = `status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`;
    return this.http.get<any>(`${this.apiUrl}/citas?${params}`);
  }

  // Ejemplo de uso correcto:
  // this.getCitas().subscribe(citas => {
  //   if (citas.length > 0) {
  //     // hay citas
  //   } else {
  //     // no hay citas
  //   }
  // });

  // Obtener citas por doctor
  getCitasPorDoctor(doctorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas/doctor/${doctorId}`);
  }

  // Reprogramar cita (cambia fecha y hora)
  rescheduleAppointment(id: number, date: string, time: string): Observable<any> {
    const payload = { date, time };
    return this.http.put(`${this.apiUrl}/appointments/${id}/reschedule`, payload);
  }
}