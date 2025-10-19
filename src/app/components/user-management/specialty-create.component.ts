import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';

import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-specialty-create',
  templateUrl: './specialty-create.component.html',
  styleUrls: ['./specialty-create.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SpecialtyCreateComponent {
  specialtyForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.specialtyForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required]
    });
  }

  submitSpecialty() {
    this.loading = true;
    this.userService.createSpecialty(this.specialtyForm.value).subscribe({
      next: () => {
        this.success = 'Especialidad creada exitosamente';
        this.error = '';
        this.specialtyForm.reset();
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al crear especialidad';
        this.success = '';
        this.loading = false;
      }
    });
  }
}
