import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { Specialty } from '../../interfaces/specialty.interface';
import { SpecialtyCreateComponent } from './specialty-create.component';

@Component({
  selector: 'app-user-create-panel',
  templateUrl: './user-create-panel.component.html',
  styleUrls: ['./user-create-panel.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpecialtyCreateComponent]
})
export class UserCreatePanelComponent implements OnInit {
  onSpecialtyCheckboxChange(event: any) {
    const specialtyId = +event.target.value;
    const checked = event.target.checked;
    const especialidades = this.doctorForm.value.especialidades as number[];
    if (checked) {
      if (!especialidades.includes(specialtyId)) {
        especialidades.push(specialtyId);
      }
    } else {
      const idx = especialidades.indexOf(specialtyId);
      if (idx > -1) {
        especialidades.splice(idx, 1);
      }
    }
    this.doctorForm.patchValue({ especialidades: [...especialidades] });
    this.doctorForm.markAsDirty();
  }
  dragPosition = { x: 0, y: 0 };
  showPanels: boolean = false;
  selectedTab: string = 'paciente';
  pacienteForm: FormGroup;
  doctorForm: FormGroup;
  secretariaForm: FormGroup;
  adminForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  specialties: Specialty[] = [];
  canCreateAdmin = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private appointmentService: AppointmentService
  ) {
    this.pacienteForm = this.fb.group({
      dpi: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      activo: [true]
    });
    this.doctorForm = this.fb.group({
      colegiado: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      activo: [true],
      especialidades: [[], Validators.required]
    });
    this.secretariaForm = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      activo: [true]
    });
    this.adminForm = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      activo: [true]
    });
  }

  ngOnInit(): void {
    // No restaurar posición: el botón es fijo y ya no es arrastrable
    this.appointmentService.getSpecialties().subscribe({
      next: (data) => {
        this.specialties = data.specialties || [];
      },
      error: (err) => {
        this.specialties = [];
      }
    });
    // Pre-chequeo de permisos para crear administradores
    try { this.canCreateAdmin = this.authService.hasRole('administrador'); } catch { this.canCreateAdmin = false; }
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.error = '';
    this.success = '';
    // Si selecciona la pestaña doctor, recargar especialidades
    if (tab === 'doctor') {
      this.appointmentService.getSpecialties().subscribe({
        next: (data) => {
          this.specialties = data.specialties || [];
        },
        error: () => {
          this.specialties = [];
        }
      });
    }
    if (tab === 'administrador') {
      // recalcular por si cambió sesión
      try { this.canCreateAdmin = this.authService.hasRole('administrador'); } catch { this.canCreateAdmin = false; }
      if (!this.canCreateAdmin) {
        this.error = 'Necesitas iniciar sesión como administrador para crear otro administrador.';
      }
    }
  }

  private formatBackendError(err: any, kind: 'paciente'|'doctor'|'secretaria'|'administrador'): string {
    try {
      const status = err?.status;
      const msg = err?.error?.message || err?.message;
      const code = err?.error?.error?.code || err?.error?.code;
      const detail = (err?.error?.error?.detail || '').toString().toLowerCase();

      if (status === 403 && kind === 'administrador') {
        return 'No estás autorizado para crear administradores. Inicia sesión como administrador.';
      }
      if (status === 400 && msg) {
        return msg;
      }
      // Postgres duplicate key (correo único u otras claves)
      if (code === '23505') {
        if (detail.includes('correo') || (msg || '').toLowerCase().includes('correo')) {
          return 'El correo ya está en uso. Por favor utiliza otro.';
        }
        return 'Registro duplicado: ya existe un elemento con esos datos.';
      }
      // Postgres not-null violation
      if (code === '23502') {
        return 'Faltan campos obligatorios o hay un valor inválido. Revisa el formulario.';
      }
      return msg || `Error al crear ${kind}`;
    } catch {
      return `Error al crear ${kind}`;
    }
  }

  submitPaciente() {
    this.loading = true;
    this.userService.createUser({ ...this.pacienteForm.value, tipo: 'paciente' })
      .subscribe({
        next: () => {
          this.success = 'Paciente creado exitosamente';
          this.error = '';
          this.pacienteForm.reset({ activo: true });
          this.loading = false;
        },
        error: err => {
          this.error = this.formatBackendError(err, 'paciente');
          this.success = '';
          this.loading = false;
        }
      });
  }

  submitDoctor() {
    this.loading = true;
    // Obtener IDs de especialidades seleccionadas
    const especialidadesIds = this.doctorForm.value.especialidades;
    // Obtener los nombres de las especialidades seleccionadas
    const especialidadesNombres = this.specialties
      .filter(s => especialidadesIds.includes(s.idEspecialidades))
      .map(s => s.Nombre);

    // Preparar datos para el backend
    const doctorData = {
      ...this.doctorForm.value,
      tipo: 'doctor',
      especialidad: especialidadesNombres.join(','), // campo especialidad como nombres separados por comas
      especialidades: especialidadesIds // enviar los IDs para la relación
    };

    this.userService.createUser(doctorData)
      .subscribe({
        next: () => {
          this.success = 'Doctor creado exitosamente';
          this.error = '';
          this.doctorForm.reset({ activo: true, especialidades: [] });
          this.loading = false;
        },
        error: err => {
          this.error = this.formatBackendError(err, 'doctor');
          this.success = '';
          this.loading = false;
        }
      });
  }

  submitSecretaria() {
    this.loading = true;
    this.userService.createUser({ ...this.secretariaForm.value, tipo: 'secretaria' })
      .subscribe({
        next: () => {
          this.success = 'Secretaria creada exitosamente';
          this.error = '';
          this.secretariaForm.reset({ activo: true });
          this.loading = false;
        },
        error: err => {
          this.error = this.formatBackendError(err, 'secretaria');
          this.success = '';
          this.loading = false;
        }
      });
  }

  submitAdmin() {
    this.loading = true;
    this.userService.createUser({ ...this.adminForm.value, tipo: 'administrador' })
      .subscribe({
        next: () => {
          this.success = 'Administrador creado exitosamente';
          this.error = '';
          this.adminForm.reset({ activo: true });
          this.loading = false;
        },
        error: err => {
          this.error = this.formatBackendError(err, 'administrador');
          this.success = '';
          this.loading = false;
        }
      });
  }
}
