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

            this.authService.setCurrentUser(user, token);
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