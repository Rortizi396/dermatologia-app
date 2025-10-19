// interfaces/administrator.interface.ts
export interface Administrator {
  idAdministradores: number;
  nombres: string;
  apellidos: string;
  correo: string;
  activo: 'SI' | 'NO';
}