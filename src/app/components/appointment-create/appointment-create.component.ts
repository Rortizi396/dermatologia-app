// appointment-create.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { PdfGeneratorUtil } from '../../utils/pdf-generator.util';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-appointment-create',
  templateUrl: './appointment-create.component.html',
  styleUrls: ['./appointment-create.component.css'],
  standalone: false,
})
export class AppointmentCreateComponent implements OnInit {
  availableTimes: string[] = [];
  allTimes: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];
  appointmentForm!: FormGroup; // Usando el operador de aserción de asignación definida
  specialties: any[] = [];
  doctors: any[] = [];
  minDate: string;
  isDoctorAvailable: boolean = true;
  loadingDoctors: boolean = false;
  noDoctorsForSpecialty: boolean = false;
  // UX flags
  actionLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private authService: AuthService,
  private pdfGenerator: PdfGeneratorUtil,
  private userService: UserService,
  private toastService: ToastService
  ) {
    // Establecer fecha mínima como hoy
    this.minDate = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSpecialties();
    // Suscribirse a cambios en fecha y hora para verificar disponibilidad
    this.appointmentForm?.get('date')?.valueChanges.subscribe(() => {
      this.updateAvailableTimes();
    });
    this.appointmentForm?.get('doctor')?.valueChanges.subscribe(() => {
      this.updateAvailableTimes();
    });
    // También recalcular disponibilidad cuando cambie la hora seleccionada
    this.appointmentForm?.get('time')?.valueChanges.subscribe(() => {
      // Si la hora seleccionada no está en las disponibles, marcar no disponible
      const t = this.appointmentForm?.get('time')?.value;
      this.isDoctorAvailable = !t || this.availableTimes.includes(t);
    });
    // Subscribe to specialty changes via valueChanges (avoids timing issue with (change) event)
    this.appointmentForm?.get('specialty')?.valueChanges.subscribe((val) => {
      this.onSpecialtyChange(val);
    });

    // Exponer util de depuración en consola (window.apptDbg())
    (window as any).apptDbg = () => {
      const f = this.appointmentForm;
      return {
        specialty: f.get('specialty')?.value,
        specialtyValid: f.get('specialty')?.valid,
        doctor: f.get('doctor')?.value,
        doctorValid: f.get('doctor')?.valid,
        date: f.get('date')?.value,
        dateValid: f.get('date')?.valid,
        time: f.get('time')?.value,
        timeValid: f.get('time')?.valid,
        isDoctorAvailable: this.isDoctorAvailable,
        availableTimes: this.availableTimes,
        canSubmit: this.canSubmit,
      };
    };
  }

  initForm(): void {
    this.appointmentForm = this.fb.group({
      patientDpi: ['', [Validators.required, Validators.pattern('^[0-9]{13}$')]],
      patientNames: [{ value: '', disabled: true }, Validators.required],
      patientLastNames: [{ value: '', disabled: true }, Validators.required],
      patientPhone: [{ value: '', disabled: true }, Validators.required],
      patientEmail: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      specialty: [null, Validators.required],
      doctor: [null, Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      observations: ['']
    });
  }

  onPatientDpiBlur(): void {
    const dpi = this.appointmentForm.get('patientDpi')?.value;
    console.log('[DPI Blur] Valor DPI:', dpi);
    if (dpi && dpi.length === 13) {
      // Consultar paciente por DPI
      this.userService.getUserDetails(dpi, 'paciente').subscribe(
        (data: any) => {
          console.log('[DPI Blur] Respuesta paciente:', data);
          const nombres = data.Nombres || data.nombres || '';
          const apellidos = data.Apellidos || data.apellidos || '';
          const telefono = data.Telefono || data.telefono || '';
          const correo = data.Correo || data.correo || '';
          this.appointmentForm.patchValue({
            patientNames: nombres,
            patientLastNames: apellidos,
            patientPhone: telefono,
            patientEmail: correo
          });
          // Mantener los campos deshabilitados para solo lectura
          this.appointmentForm.get('patientNames')?.disable();
          this.appointmentForm.get('patientLastNames')?.disable();
          this.appointmentForm.get('patientPhone')?.disable();
          this.appointmentForm.get('patientEmail')?.disable();
        },
        (error: any) => {
          console.error('[DPI Blur] Error al buscar paciente:', error);
          // Limpiar y deshabilitar campos si no se encuentra el paciente
          this.appointmentForm.patchValue({
            patientNames: '',
            patientLastNames: '',
            patientPhone: '',
            patientEmail: ''
          });
          this.appointmentForm.get('patientNames')?.disable();
          this.appointmentForm.get('patientLastNames')?.disable();
          this.appointmentForm.get('patientPhone')?.disable();
          this.appointmentForm.get('patientEmail')?.disable();
        }
      );
    }
  }

  loadSpecialties(): void {
    this.appointmentService.getSpecialties().subscribe(
      (data: any) => {
        let arr = Array.isArray(data) ? data : (data && Array.isArray(data.specialties) ? data.specialties : []);
        // Normalize backend fields (idEspecialidad / nombre) to expected keys idEspecialidades / Nombre
        this.specialties = arr.map((s: any) => ({
          idEspecialidades: s.idEspecialidades || s.idEspecialidad || s.id || s.ID || null,
          Nombre: s.Nombre || s.nombre || s.NombreEspecialidad || s.name || ''
        }));
      },
      error => console.error('Error loading specialties:', error)
    );
  }

  onSpecialtyChange(specialtyIdParam?: any): void {
    const raw = typeof specialtyIdParam !== 'undefined' ? specialtyIdParam : this.appointmentForm.get('specialty')?.value;
    // Coerce possible string values (e.g., '1', 'null') into a safe numeric ID
    const specialtyId = (typeof raw === 'number') ? raw : (raw === null || typeof raw === 'undefined' ? null : parseInt(raw, 10));
    console.log('[Especialidad Change] ID:', specialtyId);
    if (Number.isFinite(specialtyId) && (specialtyId as number) > 0) {
      this.loadingDoctors = true;
      // Reset current doctor selection and available times when specialty changes
      this.appointmentForm.patchValue({ doctor: null });
      this.availableTimes = [...this.allTimes];
      this.appointmentService.getDoctorsBySpecialty(specialtyId as number).subscribe(
        (data: any) => {
          console.log('[Especialidad Change] Respuesta doctores:', data);
          if (Array.isArray(data)) {
            this.doctors = data;
          } else if (data && Array.isArray(data.doctors)) {
            this.doctors = data.doctors;
          } else if (data && Array.isArray(data.data)) {
            this.doctors = data.data;
          } else {
            this.doctors = [];
          }
          // Normalizar por si backend devuelve campos en minúsculas
          this.doctors = this.doctors.map((d: any) => ({
            ...d,
            Nombres: d.Nombres || d.nombres || d.nombre || d.firstName || d.Nombre || '',
            Apellidos: d.Apellidos || d.apellidos || d.lastName || d.Apellido || '',
            Colegiado: d.Colegiado || d.colegiado || d.idDoctor || d.id || d.ID || null,
          }));
          // Eliminar duplicados por Colegiado en caso de repeticiones en la relación
          const seen = new Set<any>();
          this.doctors = this.doctors.filter((d: any) => {
            const key = d.Colegiado ?? d.colegiado ?? d.id ?? d.idDoctor;
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          // Ordenar por nombre y apellido para mejor UX
          this.doctors.sort((a: any, b: any) => `${a.Nombres} ${a.Apellidos}`.localeCompare(`${b.Nombres} ${b.Apellidos}`));
          // Flag for empty state
          this.noDoctorsForSpecialty = this.doctors.length === 0;

          // If there is exactly one doctor, auto-select it and update available times
          if (this.doctors.length === 1) {
            const only = this.doctors[0];
            const id = (only.Colegiado || only.colegiado || only.id || only.idDoctor);
            if (id) {
              this.appointmentForm.patchValue({ doctor: id });
              // Give the form a tick to update then recompute availability
              setTimeout(() => this.updateAvailableTimes(), 0);
            }
          }
          this.loadingDoctors = false;
        },
        error => {
          console.error('[Especialidad Change] Error al cargar doctores:', error);
          this.noDoctorsForSpecialty = false;
          this.loadingDoctors = false;
        }
      );
    } else {
      // Valor inválido o no seleccionado: limpiar lista de doctores
      this.doctors = [];
      this.noDoctorsForSpecialty = false;
      this.loadingDoctors = false;
    }
  }

  checkAvailability(): void {
    const doctorId = this.appointmentForm.get('doctor')?.value;
    const date = this.appointmentForm.get('date')?.value;
    const time = this.appointmentForm.get('time')?.value;

    if (doctorId && date && time) {
      this.appointmentService.checkDoctorAvailability(doctorId, date, time).subscribe(
        isAvailable => {
          this.isDoctorAvailable = isAvailable;
          if (!isAvailable) {
            this.appointmentForm.get('time')?.setErrors({ notAvailable: true });
          }
        },
        error => console.error('Error checking availability:', error)
      );
    }
  }

  updateAvailableTimes(): void {
    const doctorId = this.appointmentForm.get('doctor')?.value;
    const date = this.appointmentForm.get('date')?.value;
    if (doctorId && date) {
      this.appointmentService.getCitasPorDoctor(doctorId).subscribe(
        (response: any) => {
          const citas = response.citas || response || [];
          console.log('[updateAvailableTimes] Citas recibidas:', citas);
          // Normalizar horas ocupadas a formato HH:mm
          const ocupadas = citas
            .filter((c: any) => {
              let fechaCita = c.Fecha || c.fecha;
              // Si la fecha viene en formato ISO, extraer solo YYYY-MM-DD
              if (fechaCita && fechaCita.length > 10) {
                fechaCita = fechaCita.slice(0, 10);
              }
              const estado = (c.Confirmado || c.confirmado || c.Estado || c.estado || '') as string;
              const isCanceled = estado.toLowerCase() === 'cancelada';
              const match = fechaCita === date;
              if (!match) {
                console.log(`[updateAvailableTimes] Cita ignorada por fecha:`, fechaCita, date);
              }
              if (isCanceled && match) {
                console.log(`[updateAvailableTimes] Cita en estado 'Cancelada' liberando horario:`, c);
              }
              // Ocupada sólo si la fecha coincide y la cita NO está cancelada
              return match && !isCanceled;
            })
            .map((c: any) => {
              let hora = c.Hora || c.hora;
              if (hora && hora.length >= 5) {
                hora = hora.slice(0,5);
              }
              console.log(`[updateAvailableTimes] Hora ocupada:`, hora);
              return hora;
            });
          console.log('[updateAvailableTimes] Horas ocupadas:', ocupadas);
          this.availableTimes = this.allTimes.filter(t => !ocupadas.includes(t));
          console.log('[updateAvailableTimes] Horas disponibles:', this.availableTimes);
          // Actualizar flag de disponibilidad con base en la hora actual seleccionada
          const selected = this.appointmentForm.get('time')?.value;
          this.isDoctorAvailable = !selected || this.availableTimes.includes(selected);
        },
        error => {
          console.error('Error obteniendo citas del doctor:', error);
          this.availableTimes = [...this.allTimes];
          this.isDoctorAvailable = true;
        }
      );
    } else {
      this.availableTimes = [...this.allTimes];
      this.isDoctorAvailable = true;
    }
  }

  onSubmit(): void {
    if (this.appointmentForm.valid) {
      this.actionLoading = true;
      const doctorId = this.appointmentForm.get('doctor')?.value;
      const date = this.appointmentForm.get('date')?.value;
      const time = this.appointmentForm.get('time')?.value;
      this.appointmentService.checkDoctorAvailability(doctorId, date, time).subscribe(
        (isAvailable: any) => {
          if (!isAvailable || isAvailable.available === false) {
            this.toastService.show('El doctor no está disponible en la fecha y hora seleccionada.', 'error');
            this.actionLoading = false;
            return;
          }
          const appointmentData = {
            ...this.appointmentForm.value,
            // New appointments default to 'Pendiente'
            Confirmado: 'Pendiente',
            creatorId: this.authService.currentUserValue ? this.authService.currentUserValue.id : null,
            creatorType: this.authService.currentUserValue ? this.authService.currentUserValue.tipo : null
          };
          this.appointmentService.createAppointment(appointmentData).subscribe(
            response => {
              this.toastService.show('Cita creada exitosamente', 'success');
              try { this.generateAppointmentTicket(response.appointment); } catch(e) { console.warn('PDF generation failed', e); }
              // Reset form but keep minDate and doctor/specialty selections cleared
              this.appointmentForm.reset();
              this.availableTimes = [...this.allTimes];
              this.actionLoading = false;
            },
            error => {
              console.error('Error creating appointment:', error);
              this.toastService.show('Error al crear la cita. Intente nuevamente.', 'error');
              this.actionLoading = false;
            }
          );
        },
        error => {
          this.toastService.show('No se pudo validar la disponibilidad. Intente de nuevo.', 'error');
          this.actionLoading = false;
        }
      );
    }
  }

  generateAppointmentTicket(appointment: any): void {
    this.pdfGenerator.generateAppointmentTicket(appointment);
  }

  // Habilita el botón sólo cuando los campos clave son válidos
  get canSubmit(): boolean {
    const specValid = this.appointmentForm.get('specialty')?.valid;
    const docValid = this.appointmentForm.get('doctor')?.valid;
    const dateValid = this.appointmentForm.get('date')?.valid;
    const timeValid = this.appointmentForm.get('time')?.valid;
    return !!(specValid && docValid && dateValid && timeValid && this.isDoctorAvailable);
  }
}