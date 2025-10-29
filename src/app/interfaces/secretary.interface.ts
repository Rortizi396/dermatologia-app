// interfaces/secretary.interface.ts
export interface Secretary {
  idSecretarias: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  activo: 'SI' | 'NO';
}