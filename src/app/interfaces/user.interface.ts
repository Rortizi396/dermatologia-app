// interfaces/user.interface.ts
export interface User {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  activo: boolean;
  tipo: 'paciente' | 'secretaria' | 'administrador' | 'doctor';
  Estado?: string;
  // Para pacientes
  dpi?: number;
  // Para doctores
  colegiado?: number;
  // Para administradores y secretarias
  idAdministrador?: number;
  idSecretaria?: number;
}

export interface LoginResponse {
  data: any;
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}