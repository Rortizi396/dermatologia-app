import { Component, OnInit } from '@angular/core';
import { Appointment } from '../../interfaces/appointment.interface';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user.interface';

@Component({
  selector: 'app-doctor-schedule',
  templateUrl: './doctor-schedule.component.html',
  styleUrls: ['./doctor-schedule.component.css'],
  standalone: false,
  // clásico, no standalone
})
export class DoctorScheduleComponent implements OnInit {
  // ...existing code...
  onDoctorSelectFromEvent(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select?.value ? Number(select.value) : null;
    if (value) {
      this.onDoctorSelect(value);
    } else {
      this.selectedDoctorId = null;
      this.events = [];
    }
  }
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  selectedAppointment: any = null;
  selectedDoctorId: number | null = null;
  doctors: any[] = [];

  constructor(private appointmentService: AppointmentService, private authService: AuthService, private userService: UserService) {}

  ngOnInit() {
    // Cargar doctores y autoseleccionar por correo/colegiado si el usuario es doctor
    this.userService.getAllDoctores().subscribe({
      next: (r: any) => {
        this.doctors = r && r.data ? r.data : (Array.isArray(r) ? r : []);
        this.tryAutoSelectDoctor();
      },
      error: (e) => {
        console.warn('Error cargando doctores', e);
        this.doctors = [];
        // incluso si falla la carga de doctores, intentamos autoseleccionar por colegiado del usuario
        this.tryAutoSelectDoctor(true);
      }
    });
  }

  private tryAutoSelectDoctor(fallbackOnly: boolean = false) {
    const user: User | null = this.authService.currentUserValue;
    if (!user || user.tipo !== 'doctor') return;

    const userEmailRaw = (user as any)?.email || (user as any)?.correo || (user as any)?.Correo || '';
    const userEmail = String(userEmailRaw).trim().toLowerCase();
    const userLocal = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
    const userColegiadoRaw = (user as any)?.colegiado || (user as any)?.Colegiado || null;
    const userColegiado = userColegiadoRaw != null ? String(userColegiadoRaw).trim() : null;

    let selected: any = null;
    if (!fallbackOnly && Array.isArray(this.doctors) && this.doctors.length > 0) {
      // Primero intentar por correo (requisito del negocio)
      if (userEmail) {
        const exact = this.doctors.find(d => String((d.Correo ?? d.correo ?? d.email) || '').trim().toLowerCase() === userEmail) || null;
        if (exact) {
          selected = exact;
        } else {
          // Intento flexible: comparar por la parte local del correo (antes de @)
          const candidates = this.doctors.filter(d => {
            const em = String((d.Correo ?? d.correo ?? d.email) || '').trim().toLowerCase();
            const local = em.includes('@') ? em.split('@')[0] : em;
            return !!local && local === userLocal;
          });
          if (candidates.length === 1) {
            selected = candidates[0];
          }
        }
      }
      // Si no se encontró por correo, intentar por colegiado
      if (!selected && userColegiado) {
        selected = this.doctors.find(d => String(d.Colegiado ?? d.colegiado ?? d.id ?? '').trim() === userColegiado) || null;
      }
    }

    // Determinar el colegiado a usar
    const colegiadoToUse = selected ? (selected.Colegiado ?? selected.colegiado ?? selected.id) : (userColegiado ? Number(userColegiado) : null);
    if (colegiadoToUse) {
      try { console.log('[doctor-schedule] Autoselect colegiado:', colegiadoToUse); } catch {}
      // Seleccionar directamente
      try {
        this.onDoctorSelect(Number(colegiadoToUse));
      } catch (e) {
        console.warn('Fallo al seleccionar agenda del doctor:', e);
      }
    } else {
      // No se encontró coincidencia; limpiar calendario
      try { console.warn('[doctor-schedule] No se encontró doctor por correo/colegiado. Verifique que el correo del usuario coincida con el correo del doctor.'); } catch {}
      this.selectedDoctorId = null;
      this.events = [];
    }
  }

  onDoctorSelect(doctorId: number) {
    this.selectedDoctorId = doctorId;
    this.appointmentService.getCitasPorDoctor(doctorId).subscribe((response: any) => {
      const citas = response.citas || [];
      // excluir citas canceladas
      const notCancelled = (citas || []).filter((c: any) => {
        const statusRaw = c.Confirmado ?? c.confirmado ?? c.Estado ?? c.estado;
        if (statusRaw === null || statusRaw === undefined) return true;
        const s = String(statusRaw).toLowerCase();
        if (s.includes('cancel') || s === 'no' || s === '2') return false;
        return true;
      });

      this.events = notCancelled.map((raw: any) => {
        // Normalizar variantes de nombres de campos provenientes del backend (minúsculas/mayúsculas)
        const fecha = raw.Fecha ?? raw.fecha ?? null;
        const horaVal = raw.Hora ?? raw.hora ?? null;
        const pacienteNombres = raw.pacienteNombres ?? raw.pacientenombres ?? null;
        const pacienteApellidos = raw.pacienteApellidos ?? raw.pacienteapellidos ?? null;
        const pacienteDPI = raw.pacienteDPI ?? raw.pacientedpi ?? raw.Paciente ?? raw.paciente ?? '';
        const especialidadNombre = raw.especialidadNombre ?? raw.especialidadnombre ?? raw.Consulta_Especialidad ?? raw.consulta_especialidad ?? '';
        const observaciones = raw.Observaciones ?? raw.observaciones ?? '';
        const pacienteTelefono = raw.pacienteTelefono ?? raw.pacientetelefono ?? raw.Telefono ?? raw.telefono ?? '';
        const doctorNombres = raw.doctorNombres ?? raw.doctornombres ?? '';
        const doctorApellidos = raw.doctorApellidos ?? raw.doctorapellidos ?? '';
        const profesionalResp = raw.Profesional_Responsable ?? raw.profesional_responsable ?? '';

        // Construir startDate robustamente: parsear Fecha y Hora por separado cuando sea necesario
        let startDate: Date = new Date();
        if (fecha) {
          const d = new Date(fecha);
          if (!isNaN(d.getTime())) startDate = d;
        }

        // Normalizar Hora y aplicar al objeto Date si es posible
        if (horaVal) {
          const horaRaw = String(horaVal).trim();
          // Intentar extraer HH:mm
          const m = horaRaw.match(/(\d{1,2}):(\d{2})/);
          if (m) {
            const hh = parseInt(m[1], 10);
            const mm = parseInt(m[2], 10);
            startDate.setHours(hh, mm, 0, 0);
          } else if (fecha) {
            // último recurso: intentar parsear como parte de un ISO
            const parsed = new Date(`${fecha}T${horaRaw}`);
            if (!isNaN(parsed.getTime())) startDate = parsed;
          }
        }

  // Normalizar estado de confirmado a una etiqueta legible
  const statusRaw = raw.Confirmado ?? raw.confirmado ?? raw.Estado ?? raw.estado;
        let confirmadoLabel = 'Pendiente';
        if (typeof statusRaw === 'number') {
          if (statusRaw === 1) confirmadoLabel = 'Confirmada';
          else if (statusRaw === 2) confirmadoLabel = 'Cancelada';
        } else if (typeof statusRaw === 'string') {
          const s = statusRaw.toLowerCase();
          if (s === 'si' || s === 'sí' || s === 'confirmada' || s === 'confirmado' || s === 'true' || s === '1') {
            confirmadoLabel = 'Confirmada';
          } else if (s.includes('cancel') || s === 'cancelada' || s === 'cancelado' || s === '2') {
            confirmadoLabel = 'Cancelada';
          } else {
            confirmadoLabel = 'Pendiente';
          }
        }

        // determinar clase de icono FontAwesome según el estado
        let iconClass = 'fa-solid fa-hourglass-half text-warning';
        if (statusRaw === 1 || statusRaw === '1' || String(statusRaw).toLowerCase() === 'si' || String(statusRaw).toLowerCase() === 'sí' || String(statusRaw).toLowerCase() === 'confirmada' || statusRaw === true) {
          iconClass = 'fa-solid fa-check text-success';
        } else if (String(statusRaw).toLowerCase().includes('cancel') || String(statusRaw).toLowerCase() === 'no' || String(statusRaw).toLowerCase() === '2') {
          iconClass = 'fa-solid fa-xmark text-danger';
        }

        const pacienteLabel = pacienteNombres ? `${pacienteNombres} ${pacienteApellidos ?? ''}`.trim() : pacienteDPI;
        const doctorLabel = doctorNombres ? `${doctorNombres} ${doctorApellidos ?? ''}`.trim() : profesionalResp;

        return {
          start: startDate,
          title: `Cita con ${pacienteLabel || 'Paciente'}`,
          meta: {
            paciente: pacienteLabel,
            especialidad: especialidadNombre,
            detalles: observaciones,
            telefono: pacienteTelefono,
            doctor: doctorLabel,
            // guardamos tanto el valor original como la etiqueta legible
            confirmado: {
              raw: statusRaw,
              label: confirmadoLabel
            },
            confirmadoIconClass: iconClass
          }
        };
      });
      console.log('Eventos para el calendario:', this.events);
    });
  }

  handleEventClick(event: CalendarEvent): void {
  // Aseguramos que meta tenga todos los campos esperados y preservamos el valor raw de la BD
    const raw = event.meta?.confirmado?.raw ?? event.meta?.confirmado ?? null;
    const label = event.meta?.confirmado?.label ?? (raw ?? 'Pendiente');
      // Derivar una clase CSS y una clase de icono (FontAwesome) a partir del valor raw o meta
      let cls = 'text-warning';
      let iconClass = event.meta?.confirmadoIconClass || 'fa-solid fa-hourglass-half text-warning';
      if (raw === 1 || raw === '1' || String(raw).toLowerCase() === 'si' || String(raw).toLowerCase() === 'sí' || String(raw).toLowerCase() === 'confirmada' || raw === true) {
        cls = 'text-success';
        iconClass = event.meta?.confirmadoIconClass || 'fa-solid fa-check text-success';
      } else if (String(raw).toLowerCase().includes('cancel') || String(raw).toLowerCase() === 'no' || String(raw).toLowerCase() === '2') {
        cls = 'text-danger';
        iconClass = event.meta?.confirmadoIconClass || 'fa-solid fa-xmark text-danger';
    }
    this.selectedAppointment = {
      title: event.title,
      start: event.start,
      paciente: event.meta?.paciente || '',
      especialidad: event.meta?.especialidad || '',
      detalles: event.meta?.detalles || '',
      telefono: event.meta?.telefono || '',
      confirmadoLabel: label,
      confirmadoRaw: raw,
      confirmadoClass: cls,
        confirmadoIconClass: iconClass
    };
  }
}
