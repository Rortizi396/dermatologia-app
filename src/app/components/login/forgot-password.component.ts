import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  loading = false;
  error: string | null = null;
  success: string | null = null;
  form: any;

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.form = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      nuevaContrasenia: ['', [Validators.required, Validators.minLength(4)]],
      confirmar: ['', [Validators.required]]
    });
  }

  submit() {
    this.error = null;
    this.success = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const correo = this.form.get('correo')!.value;
    const nueva = this.form.get('nuevaContrasenia')!.value;
    const confirmar = this.form.get('confirmar')!.value;
    if (nueva !== confirmar) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.loading = true;
    this.http.post('/api/auth/reset-password', { correo, nuevaContrasenia: nueva }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.success) {
          this.success = 'Contraseña actualizada correctamente. Puedes iniciar sesión ahora.';
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.error = (res && res.message) ? res.message : 'Error al actualizar la contraseña';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = (err && err.error && err.error.message) ? err.error.message : 'Error de servidor';
      }
    });
  }
}
