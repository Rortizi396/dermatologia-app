// interfaces/appointment.interface.ts
import { Patient } from './patient.interface';
import { Specialty } from './specialty.interface';
import { Doctor } from './doctor.interface';
import { User } from './user.interface';

export interface Appointment {
  idCitas: number;
  paciente: number; // DPI del paciente
  pacienteInfo?: Patient; // Información completa del paciente
  consulta_Especialidad: number;
  especialidadInfo?: Specialty; // Información completa de la especialidad
  profesional_Responsable: number;
  doctorInfo?: Doctor; // Información completa del doctor
  observaciones: string;
  fecha: string; // Formato YYYY-MM-DD
  hora: string; // Formato HH:MM:SS
  confirmado: 'SI' | 'NO';
  id_Creador: number;
  creadorInfo?: User; // Información del creador de la cita
  fechaCreacion?: string;
}

export interface CreateAppointmentRequest {
  patientDpi: number;
  patientNames: string;
  patientLastNames: string;
  patientPhone: string;
  patientEmail: string;
  specialty: number;
  doctor: number;
  date: string;
  time: string;
  observations?: string;
  creatorId: number;
}

export interface AppointmentResponse {
  success: boolean;
  appointment: Appointment;
  message?: string;
}