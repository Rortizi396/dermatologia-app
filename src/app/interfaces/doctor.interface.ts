// interfaces/doctor.interface.ts
import { Specialty } from './specialty.interface';

export interface Doctor {
  colegiado: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  activo: 'SI' | 'NO';
  especialidades?: Specialty[];
}

export interface DoctorAvailability {
  doctorId: number;
  date: string;
  time: string;
  available: boolean;
}

export interface DoctorWithSpecialties extends Doctor {
  especialidades: Specialty[];
}