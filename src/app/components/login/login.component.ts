// components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  error = '';
  returnUrl: string = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Redirigir si ya está logueado
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.initForm();
    // Obtener return url de los query parameters o por defecto a dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = '';
      const payload = this.loginForm.value;
      console.log('[Login] Enviando payload:', payload);
      this.userService.login(payload).subscribe({
        next: (response) => {
          console.log('[Login] Respuesta completa del backend:', response);
          // Soporta ambas estructuras: response.data.user/response.data.token y response.user/response.token
          let user = null;
          let token = null;
          if (response && response.data && response.data.user && response.data.token) {
            user = response.data.user;
            token = response.data.token;
          } else if (response && response.user && response.token) {
            user = response.user;
            token = response.token;
          }
          console.log('[Login] Parsed user:', user);
          console.log('[Login] Parsed token:', token);
          if (user && token) {
            // Store token immediately so the interceptor can attach it for subsequent enrichment calls
            // (e.g., getProfile). We'll update the stored user again after enrichment if needed.
            try { this.authService.setCurrentUser(user, token); } catch (e) { /* no-op */ }
            // Normalize role field to `tipo` (support various API shapes: Tipo, TIPO, type)
            try {
              if (!user.tipo && (user.Tipo || user.TIPO || user.type)) {
                user.tipo = (user.Tipo || user.TIPO || user.type).toString().toLowerCase();
              } else if (user.tipo) {
                user.tipo = String(user.tipo).toLowerCase();
              }
            } catch (e) {
              console.warn('Could not normalize user.tipo', e);
            }

            // Enrich user data before navigating: try profile endpoint, else fall back to scanning /api/users
            const finishNavigation = () => {
              this.loading = false;
              let target = this.returnUrl || '/dashboard';
              // If user is paciente and no explicit returnUrl provided, send to patient-specific dashboard
              try {
                if ((!this.returnUrl || this.returnUrl === '/dashboard')) {
                  if (user && user.tipo === 'paciente') {
                    target = '/dashboard/paciente';
                  } else if (user && user.tipo === 'secretaria') {
                    target = '/dashboard/secretaria';
                  } else if (user && user.tipo === 'doctor') {
                    target = '/dashboard/doctor';
                  }
                }
              } catch (e) {}
              console.log('[Login] Navegando a:', target);
              // Navegar a la returnUrl si existe, o al dashboard por defecto
              this.router.navigateByUrl(target);
            };

            const doEnrichment = () => {
              // If we already have tipo, proceed immediately (user/token already stored)
              if (user && user.tipo) {
                // Optionally refresh stored user (harmless duplicate)
                try { this.authService.setCurrentUser(user, token); } catch {}
                finishNavigation();
                return;
              }

              // try profile endpoint
              this.userService.getProfile().subscribe({
                next: (profResp: any) => {
                  try {
                    const profile = (profResp && profResp.data) ? profResp.data : (profResp && profResp.user) ? profResp.user : profResp;
                    if (profile) {
                      if (!user.nombres && (profile.nombres || profile.Nombres)) user.nombres = profile.nombres || profile.Nombres;
                      if (!user.apellidos && (profile.apellidos || profile.Apellidos)) user.apellidos = profile.apellidos || profile.Apellidos;
                      if (!user.tipo && (profile.tipo || profile.Tipo)) user.tipo = (profile.tipo || profile.Tipo || '').toString().toLowerCase();
                    }
                  } catch (e) { console.warn('Failed to merge profile after login', e); }
                  // Update stored user with enriched fields
                  this.authService.setCurrentUser(user, token);
                  finishNavigation();
                },
                error: (_) => {
                  // profile endpoint not available — fallback to listing users and matching by correo
                  this.userService.getAllUsers().subscribe({
                    next: (listResp: any) => {
                      try {
                        const arr = listResp && listResp.data ? listResp.data : (Array.isArray(listResp) ? listResp : []);
                        const found = (arr || []).find((u: any) => String(u.correo || u.email).toLowerCase() === String(user.correo || user.email).toLowerCase());
                        if (found) {
                          if (!user.nombres && (found.nombres || found.Nombres)) user.nombres = found.nombres || found.Nombres;
                          if (!user.apellidos && (found.apellidos || found.Apellidos)) user.apellidos = found.apellidos || found.Apellidos;
                          if (!user.tipo && (found.tipo || found.Tipo)) user.tipo = (found.tipo || found.Tipo || '').toString().toLowerCase();
                        }
                      } catch (e) { console.warn('Error scanning users list after login', e); }
                      this.authService.setCurrentUser(user, token);
                      finishNavigation();
                    },
                    error: (e) => {
                      // give up — store whatever we have and continue
                      console.warn('Failed to fetch users list for profile enrichment', e);
                      this.authService.setCurrentUser(user, token);
                      finishNavigation();
                    }
                  });
                }
              });
            };

            // start enrichment then navigate
            try { doEnrichment(); } catch (e) { console.warn('Enrichment failed', e); this.authService.setCurrentUser(user, token); this.loading = false; this.router.navigateByUrl(this.returnUrl || '/dashboard'); }
          } else {
            console.error('Estructura incorrecta de respuesta:', response);
            this.error = 'Error en la estructura de la respuesta del servidor';
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('Error en login:', err);
          this.error = 'Credenciales incorrectas o error de servidor';
          this.loading = false;
        }
      });
    }
  }
}