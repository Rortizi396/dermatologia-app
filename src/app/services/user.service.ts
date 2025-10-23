// ...existing code...
// ...existing code...
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { 
  User, 
  LoginResponse, 
  LoginRequest,
  ApiResponse,
  PaginatedResponse 
} from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private _userChanges = new Subject<void>();
  // Observable that components can subscribe to when users change
  userChanges$ = this._userChanges.asObservable();
  // Dar de alta usuario en la tabla Usuarios
  activateUsuario(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/activate`, {}).pipe(
      tap(() => this._userChanges.next())
    );
  }

  // Editar usuario en tabla usuarios
  updateUsuario(id: number, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${id}`, userData).pipe(
      tap(() => this._userChanges.next())
    );
  }
  // Dar de baja usuario en la tabla Usuarios
  inactivateUsuario(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/inactivate`, {}).pipe(
      tap(() => this._userChanges.next())
    );
  }
  // Obtener todas las secretarias
  getAllSecretarias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/secretarias`);
  }

  // Obtener todos los doctores
  getAllDoctores(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/doctores`);
  }

  // Obtener todos los administradores
  getAllAdministradores(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/administradores`);
  }
  createSpecialty(data: { nombre: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/specialties`, data);
  }
  // Consulta información específica según tipo
  getUserDetails(id: number, tipo: string): Observable<any> {
    let endpoint = '';
    switch (tipo.toLowerCase()) {
      case 'paciente':
        endpoint = `/pacientes/${id}`;
        break;
      case 'doctor':
        endpoint = `/doctores/${id}`;
        break;
      case 'secretaria':
        endpoint = `/secretarias/${id}`;
        break;
      case 'administrador':
        endpoint = `/administradores/${id}`;
        break;
      default:
        endpoint = `/users/${id}`;
    }
    return this.http.get<any>(`${this.apiUrl}${endpoint}`);
  }
  // Runtime-configurable API base URL. When deployed to GitHub Pages, set
  // window.__env.apiUrl to the public backend URL (e.g. https://mi-backend.com)
  private apiUrl = (window as any).__env?.apiUrl || '/api';

  constructor(private http: HttpClient) { }

  // Editar usuario por tipo
  updateUserByType(tipo: string, id: any, userData: any): Observable<any> {
    let tipoEndpoint = tipo.toLowerCase();
    if (tipoEndpoint === 'paciente') tipoEndpoint = 'pacientes';
    if (tipoEndpoint === 'doctor') tipoEndpoint = 'doctores';
    if (tipoEndpoint === 'secretaria') tipoEndpoint = 'secretarias';
    if (tipoEndpoint === 'administrador') tipoEndpoint = 'administradores';
    return this.http.put(`${this.apiUrl}/${tipoEndpoint}/${id}`, userData);
  }

  // Dar de baja usuario por tipo
  inactivateUserByType(tipo: string, id: any): Observable<any> {
    let tipoEndpoint = tipo.toLowerCase();
    if (tipoEndpoint === 'paciente') tipoEndpoint = 'pacientes';
    if (tipoEndpoint === 'doctor') tipoEndpoint = 'doctores';
    if (tipoEndpoint === 'secretaria') tipoEndpoint = 'secretarias';
    if (tipoEndpoint === 'administrador') tipoEndpoint = 'administradores';
    return this.http.patch(`${this.apiUrl}/${tipoEndpoint}/${id}/inactivate`, {});
  }

  // Autenticación
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  register(userData: any): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/auth/register`, userData);
  }

  // Gestión de usuarios
  getAllUsers(): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users`);
  }

  getUserById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/users/${id}`);
  }

  createUser(userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/users`, userData).pipe(
      tap(() => this._userChanges.next())
    );
  }

  updateUser(id: number, userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/users/${id}`, userData).pipe(
      tap(() => this._userChanges.next())
    );
  }

  deleteUser(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/users/${id}`).pipe(
      tap(() => this._userChanges.next())
    );
  }

  activateUser(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/users/${id}/activate`, {}).pipe(
      tap(() => this._userChanges.next())
    );
  }

  deactivateUser(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/users/${id}/deactivate`, {}).pipe(
      tap(() => this._userChanges.next())
    );
  }

  // Búsqueda y filtros
  searchUsers(query: string): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users/search?q=${query}`);
  }

  getUsersByType(type: string): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users/type/${type}`);
  }

  // Perfil de usuario
  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/users/profile`);
  }

  updateProfile(userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/users/profile`, userData);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/users/change-password`, {
      oldPassword,
      newPassword
    });
  }
}