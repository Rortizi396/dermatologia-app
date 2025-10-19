// interfaces/filters.interface.ts
export interface AppointmentFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  doctor?: number;
  especialidad?: number;
  confirmado?: 'SI' | 'NO';
  paciente?: number;
}

export interface DoctorFilters {
  especialidad?: number;
  activo?: 'SI' | 'NO';
}

export interface PatientFilters {
  activo?: 'SI' | 'NO';
  fechaCreacionDesde?: string;
  fechaCreacionHasta?: string;
}