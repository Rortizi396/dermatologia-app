// ...existing code...
// appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  private apiUrl = '/api';

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
    // Normalize backend shape to frontend-friendly shape
    return this.http.get<any>(`${this.apiUrl}/specialties`).pipe(
      map((resp: any) => {
        const raw = resp && resp.specialties ? resp.specialties : [];
        const normalized = (raw || []).map((s: any) => ({
          idEspecialidades: s.idEspecialidad ?? s.idEspecialidades,
          Nombre: s.nombre ?? s.Nombre,
          Descripcion: s.descripcion ?? s.Descripcion
        }));
        return { specialties: normalized };
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