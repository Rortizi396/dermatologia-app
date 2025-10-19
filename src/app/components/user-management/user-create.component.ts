import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class UserCreateComponent {
  userForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  tipos = [
    { value: 'paciente', label: 'Paciente' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'secretaria', label: 'Secretaria' },
    { value: 'administrador', label: 'Administrador' }
  ];

  constructor(private fb: FormBuilder, private userService: UserService, private router: Router) {
    this.userForm = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      tipo: ['', Validators.required],
      activo: [true],
      dpi: [''],
      colegiado: [''],
      idAdministrador: [''],
      idSecretaria: [''],
      telefono: ['']
    });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.loading = true;
      this.error = '';
      this.success = '';
      this.userService.createUser(this.userForm.value).subscribe({
        next: (res) => {
          this.success = 'Usuario creado exitosamente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/users']), 1200);
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al crear usuario';
          this.loading = false;
        }
      });
    }
  }
}
