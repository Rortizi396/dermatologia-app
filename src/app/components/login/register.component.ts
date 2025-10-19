import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  imports: [ReactiveFormsModule, CommonModule, RouterModule, FormsModule]
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(private fb: FormBuilder, private userService: UserService, private router: Router) {
    this.registerForm = this.fb.group({
      dpi: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      activo: [true]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.error = '';
      this.success = '';
      const userData = {
        correo: this.registerForm.value.correo,
        password: this.registerForm.value.password,
        tipo: 'paciente' as const,
        nombres: this.registerForm.value.nombres,
        apellidos: this.registerForm.value.apellidos,
        telefono: this.registerForm.value.telefono,
        dpi: this.registerForm.value.dpi,
        activo: this.registerForm.value.activo
      };
      this.userService.createUser(userData).subscribe({
        next: (res) => {
          this.success = 'Registro exitoso. Ahora puedes iniciar sesión.';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar usuario';
          this.loading = false;
        }
      });
    }
  }
}
