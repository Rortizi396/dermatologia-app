// interfaces/specialty.interface.ts

import { Doctor } from './doctor.interface';

export interface Specialty {
  idEspecialidades: number;
  Nombre: string;
  Descripcion?: string;
}

export interface SpecialtyWithDoctors extends Specialty {
  doctores: Doctor[];
}