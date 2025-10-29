// interfaces/patient.interface.ts

import { Appointment } from './appointment.interface';

export interface Patient {
  dpi: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  activo: 'SI' | 'NO';
  citas?: Appointment[];
}

export interface CreatePatientRequest {
  dpi: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
}