// interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Obtener el token del auth service
    const token = this.authService.getToken();
    
    // Clonar la request y añadir el header Authorization si existe el token,
    // excepto para endpoints públicos donde queremos evitar preflight CORS.
    // Caso específico: GET /api/doctores (lista de doctores pública)
    const isPublicDoctorsList = request.method === 'GET' && /\/doctores(\?.*)?$/i.test(request.url);
    if (token && !isPublicDoctorsList) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}