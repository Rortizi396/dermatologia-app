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
    // Obtener lista de doctores a través del servicio de usuarios
    this.userService.getAllDoctores().subscribe({ next: (r:any) => {
        this.doctors = r && r.data ? r.data : (Array.isArray(r) ? r : []);
        // si el usuario es doctor intentar auto-seleccionar
        const user: User | null = this.authService.currentUserValue;
        if (user && user.tipo === 'doctor') {
          const colegiado = (user.colegiado as unknown) as number | string;
          const userEmail = (user as any)?.email || (user as any)?.correo || null;
          // Buscar por colegiado en la lista de doctores
          let found: any = null;
          if (colegiado) {
            found = this.doctors.find(d => String(d.Colegiado || d.colegiado || d.colegiado_numero || d.ColegiadoNumero || d.id) === String(colegiado));
          }
          // si no encontrado, intentar por email
          if (!found && userEmail) {
            found = this.doctors.find(d => String(d.Correo || d.correo || d.email).toLowerCase() === String(userEmail).toLowerCase());
          }
          if (found) {
            // intentar seleccionar
            setTimeout(() => { this.onDoctorSelect(found.Colegiado || found.colegiado || found.id); }, 50);
          }
        }
      }, error: (e) => { console.warn('Error cargando doctores', e); this.doctors = []; } });
    // Si hay un usuario logueado y es doctor, autoseleccionar su agenda
    const user: User | null = this.authService.currentUserValue;
    if (user && user.tipo === 'doctor') {
      // si el usuario tiene 'colegiado' usamos ese valor para filtrar
      const colegiado = (user.colegiado as unknown) as number;
      if (colegiado) {
        // Intentamos autoseleccionar después de una pequeña espera para que 'doctors' haya cargado
        setTimeout(() => {
          try {
            this.onDoctorSelect(colegiado);
          } catch (e) {
            console.warn('No se pudo autoseleccionar la agenda del doctor:', e);
          }
        }, 250);
      }
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

      this.events = notCancelled.map((cita: any) => {
        // Construir startDate robustamente: parsear Fecha y Hora por separado cuando sea necesario
        let startDate: Date;
        if (cita.Fecha) {
          startDate = new Date(cita.Fecha);
        } else {
          startDate = new Date();
        }

        // Normalizar Hora y aplicar al objeto Date si es posible
        if (cita.Hora) {
          const horaRaw = String(cita.Hora).trim();
          // Intentar extraer HH:mm
          const m = horaRaw.match(/(\d{1,2}):(\d{2})/);
          if (m) {
            const hh = parseInt(m[1], 10);
            const mm = parseInt(m[2], 10);
            startDate.setHours(hh, mm, 0, 0);
          } else {
            // último recurso: intentar parsear como parte de un ISO
            const parsed = new Date(`${cita.Fecha}T${horaRaw}`);
            if (!isNaN(parsed.getTime())) startDate = parsed;
          }
        }

  // Normalizar estado de confirmado a una etiqueta legible
  const statusRaw = cita.Confirmado ?? cita.confirmado ?? cita.Estado ?? cita.estado;
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

        return {
          start: startDate,
          title: `Cita con ${cita.pacienteNombres ? cita.pacienteNombres + ' ' + cita.pacienteApellidos : cita.pacienteDPI || cita.Paciente}`,
          meta: {
            paciente: cita.pacienteNombres ? `${cita.pacienteNombres} ${cita.pacienteApellidos}` : cita.pacienteDPI || cita.Paciente,
            especialidad: cita.especialidadNombre || cita.Consulta_Especialidad,
            detalles: cita.Observaciones,
            telefono: cita.pacienteTelefono,
            doctor: cita.doctorNombres ? `${cita.doctorNombres} ${cita.doctorApellidos}` : cita.Profesional_Responsable,
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
