import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { ToastService } from '../../services/toast.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor],
  templateUrl: './secretary-dashboard.component.html',
  styleUrls: ['./secretary-dashboard.component.css']
})
export class SecretaryDashboardComponent implements OnInit {
  appointments: any[] = [];
  loading = false;
  page = 1;
  limit = 25;
  dateFilter: string | null = null;
  statusFilter: string | null = null;
  // Clock
  timeString: string = '';
  dateString: string = '';
  use24Hour = true;
  private _clockInterval: any = null;

  // Reprogramming
  selectedAppointmentId: number | null = null;
  selectedAppointment: any = null;
  newDate: string = '';
  newTime: string = '';
  availabilityChecked = false;
  available = false;
  // Lógica de horarios (misma que en appointment-create)
  allTimes: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];
  availableTimes: string[] = [];
  // Helper de depuración para inspeccionar respuestas crudas en tiempo de ejecución
  debugResp: any = null;
  // Toggle de UI para mostrar el JSON crudo de depuración
  showDebug: boolean = false;
  // Mission & Vision
  missionText: string = '';
  visionText: string = '';

  constructor(private appointmentService: AppointmentService, private toast: ToastService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAppointments();
    this.loadClockPreference();
    this.startClock();
    this.loadMissionVision();
  }

  private loadMissionVision(): void {
    try {
      this.http.get<any>('/api/settings/mission').subscribe({ next: (r: any) => { this.missionText = r && r.value ? r.value : ''; }, error: (e) => { console.error('Error loading mission for secretary dashboard', e); this.missionText = ''; } });
    } catch (e) { console.warn(e); }
    try {
      this.http.get<any>('/api/settings/vision').subscribe({ next: (r: any) => { this.visionText = r && r.value ? r.value : ''; }, error: (e) => { console.error('Error loading vision for secretary dashboard', e); this.visionText = ''; } });
    } catch (e) { console.warn(e); }
  }

  ngOnDestroy(): void {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }

  private startClock(): void {
    const update = () => {
      const now = new Date();
      this.timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !this.use24Hour });
      this.dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    update();
    this._clockInterval = setInterval(update, 1000);
  }

  private clockPrefKey(): string { return 'clockFormat:secretaria'; }
  private loadClockPreference(): void {
    try { const v = localStorage.getItem(this.clockPrefKey()); if (v === '12') this.use24Hour = false; else this.use24Hour = true; } catch(e){}

  }

  private saveClockPreference(): void {
    try { localStorage.setItem(this.clockPrefKey(), this.use24Hour ? '24' : '12'); } catch {}
  }

  toggleClockFormat(): void {
    this.use24Hour = !this.use24Hour;
    this.saveClockPreference();
    if (this._clockInterval) { clearInterval(this._clockInterval); this._clockInterval = null; }
    this.startClock();
  }

  loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getCitasPaged(this.page, this.limit, this.dateFilter || undefined, this.statusFilter || undefined)
      .subscribe({
        next: (resp: any) => {
          // Resp expected: { data: [...], total, page }
          console.log('[SecretaryDashboard] raw response from getCitasPaged:', resp);
          this.debugResp = resp; // expose raw response for runtime debugging
          const raw = Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : resp);
          // Filter to only pending/confirmed (or equivalent) items
          this.appointments = (raw || []).filter((c: any) => this.isSelectable(c));
          console.log('[SecretaryDashboard] filtered appointments:', this.appointments);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading citas paged', err);
          this.toast.show('Error cargando citas');
          this.loading = false;
        }
      });
  }

  confirm(id: number): void {
    this.appointmentService.confirmAppointment(id).subscribe({
      next: () => { this.toast.show('Cita confirmada'); this.loadAppointments(); },
      error: (e) => { this.toast.show('Error confirmando cita'); console.error(e); }
    });
  }

  cancel(id: number): void {
    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => { this.toast.show('Cita cancelada'); this.loadAppointments(); },
      error: (e) => { this.toast.show('Error cancelando cita'); console.error(e); }
    });
  }

  selectAppointment(id: number): void {
    this.selectedAppointmentId = id;
    // Be tolerant to string/number id shapes and multiple id keys
    this.selectedAppointment = this.appointments.find(a => (String(a.idCitas || a.idcitas || a.id) === String(id))) || null;
    this.availabilityChecked = false;
    this.available = false;
    // default newDate to appointment date and load times
    if (this.selectedAppointment) {
      // Normalize fecha to yyyy-MM-dd if possible
      let f = this.selectedAppointment.fecha || this.selectedAppointment.Fecha || this.selectedAppointment.date;
      if (f && f.length > 10) f = f.slice(0,10);
      this.newDate = f || '';
      // set default time to current appointment time (but user should pick from availableTimes)
      this.newTime = (this.selectedAppointment.hora || this.selectedAppointment.Hora || this.selectedAppointment.time || '').slice(0,5) || '';
      const doctorId = this.getDoctorIdFromAppointment(this.selectedAppointment);
      console.log('[SecretaryDashboard] selectAppointment selected', { id, doctorId, newDate: this.newDate, newTime: this.newTime, selectedAppointment: this.selectedAppointment });
      // Always attempt to populate availableTimes so the combobox isn't empty
      this.updateAvailableTimes(doctorId, this.newDate);
    }
  }

  getDoctorIdFromAppointment(c: any): any {
    if (!c) return null;
    const candidates = [c.Profesional_Responsable, c.profesional_Responsable, c.profesionalResponsable, c.profesional_responsable, c.doctorId, c.doctor_id, c.medicoId, c.medico, c.doctor && (c.doctor.id || c.doctor._id || c.doctor.userId)];
    for (const v of candidates) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  displayPatientName(c: any): string {
    if (!c) return '';
    // Try multiple variants from API and potential DB aliases
    const pn = c.pacienteNombres || c.pacienteNombre || c.pacientenombres || c.paciente_nombres || c.Paciente_Nombres || c.patientName || (c.paciente && (c.paciente.nombres || c.paciente.Nombre)) || (c.pacienteInfo && c.pacienteInfo.nombres);
    const pa = c.pacienteApellidos || c.pacienteapellidos || c.paciente_apellidos || c.Paciente_Apellidos || (c.paciente && (c.paciente.apellidos || c.paciente.Apellidos)) || (c.pacienteInfo && c.pacienteInfo.apellidos);
    if (pn || pa) return ((pn || '') + ' ' + (pa || '')).trim();
    return (c.paciente && (c.paciente.nombres || c.paciente.name || c.paciente.fullName)) || c.paciente || '';
  }

  displayDoctorName(c: any): string {
    if (!c) return '';
    const dn = c.doctorNombres || c.doctorNombre || c.doctornombres || c.doctor_nombres || c.Doctor_Nombres || c.doctorName || (c.doctor && (c.doctor.nombres || c.doctor.Nombre)) || (c.doctorInfo && c.doctorInfo.nombres);
    const da = c.doctorApellidos || c.doctorapellidos || c.doctor_apellidos || c.Doctor_Apellidos || (c.doctor && (c.doctor.apellidos || c.doctor.Apellidos)) || (c.doctorInfo && c.doctorInfo.apellidos);
    if (dn || da) return ((dn || '') + ' ' + (da || '')).trim();
    return (c.medico && (c.medico.nombres || c.medico.name || c.medico.fullName)) || c.medico || '';
  }

  getDateDisplay(c: any): string {
    if (!c) return '';
    let d: any = c.fecha || c.Fecha || c.date;
    if (!d) return '-';
    if (typeof d === 'string' && d.length > 10) d = d.slice(0, 10);
    // Expecting YYYY-MM-DD
    if (typeof d === 'string' && d.includes('-')) {
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {}
    return String(d);
  }

  getTimeDisplay(c: any): string {
    if (!c) return '';
    let t: any = c.hora || c.Hora || c.time;
    if (!t) return '-';
    t = String(t);
    if (t.length >= 5) return t.slice(0,5);
    return t;
  }

  getStatus(c: any): string {
    if (!c) return '';
    const raw = c.Confirmado || c.confirmado || c.estado || c.Estado || c.status || c.Status || '';
    const s = String(raw).toLowerCase();
    if (s.includes('pend')) return 'Pendiente';
    if (s.includes('confirm')) return 'Confirmada';
    if (s.includes('cancel')) return 'Cancelada';
    // Fallback: capitalize first letter if present
    if (!raw) return '';
    try { return String(raw).charAt(0).toUpperCase() + String(raw).slice(1); } catch { return String(raw); }
  }

  getStatusClass(c: any): string {
    const st = (this.getStatus(c) || '').toLowerCase();
    if (st === 'pendiente') return 'bg-warning text-dark';
    if (st === 'confirmada') return 'bg-success';
    if (st === 'cancelada') return 'bg-danger';
    return 'bg-secondary';
  }

  getStatusSoftClass(c: any): string {
    const st = (this.getStatus(c) || '').toLowerCase();
    if (st === 'pendiente') return 'warning';
    if (st === 'confirmada') return 'success';
    if (st === 'cancelada') return 'danger';
    return 'primary';
  }

  isSelectable(c: any): boolean {
    if (!c) return false;
    // Backend uses 'Confirmado' with values like 'Confirmada', 'Pendiente', 'Cancelada'
    const estado = (c.Confirmado || c.confirmado || c.estado || c.Estado || c.status || c.Status);
    if (estado === undefined || estado === null) return false;
    const s = String(estado).toLowerCase();
    if (s.includes('cancel')) return false; // explicitly not selectable
    return s.includes('pendient') || s.includes('confirm') || s === 'si' || s === 'sí' || s === 'true' || s === '1';
  }

  checkAvailability(): void {
    // method removed: availability is checked automatically on time change
  }

  onTimeChange(): void {
    // auto-validate selected time
    if (!this.selectedAppointment || !this.newDate || !this.newTime) {
      this.availabilityChecked = false; this.available = false; return;
    }
    const apt = this.selectedAppointment;
    // Use the same robust resolver used elsewhere to avoid undefined doctorId
    const doctorId = this.getDoctorIdFromAppointment(apt);
    console.log('[SecretaryDashboard] onTimeChange', { doctorId, date: this.newDate, time: this.newTime, availableTimes: this.availableTimes });
    if (!doctorId) { this.availabilityChecked = true; this.available = false; return; }
    if (this.availableTimes && this.availableTimes.length > 0) {
      const ok = this.availableTimes.includes(this.newTime) || (this.newTime === (apt.hora || apt.Hora || apt.time));
      this.availabilityChecked = true;
      this.available = !!ok;
      return;
    }
    // fallback: ask server
    this.appointmentService.checkDoctorAvailability(doctorId, this.newDate, this.newTime).subscribe({
      next: (ok: boolean) => { this.availabilityChecked = true; this.available = !!ok; },
      error: (e) => { console.error(e); this.availabilityChecked = true; this.available = false; }
    });
  }

  reschedule(): void {
    if (!this.selectedAppointmentId || !this.newDate || !this.newTime) { this.toast.show('Selecciona una cita y la nueva fecha/hora'); return; }
    if (!this.availabilityChecked || !this.available) { this.toast.show('Verifica disponibilidad antes de reprogramar'); return; }
    this.appointmentService.rescheduleAppointment(this.selectedAppointmentId, this.newDate, this.newTime).subscribe({
      next: () => { this.toast.show('Cita reprogramada'); this.loadAppointments(); this.selectedAppointmentId = null; this.newDate = ''; this.newTime = ''; this.availabilityChecked = false; this.available = false; },
      error: (e) => { console.error(e); this.toast.show('Error reprogramando cita'); }
    });
  }

  updateAvailableTimes(doctorId: any, date: string): void {
    if (!doctorId || !date) { this.availableTimes = [...this.allTimes]; return; }
    this.appointmentService.getCitasPorDoctor(doctorId).subscribe({
      next: (response: any) => {
        const citas = response.citas || response || [];
        const ocupadas = citas
          .filter((c: any) => {
            let fechaCita = c.Fecha || c.fecha || c.date;
            if (fechaCita && fechaCita.length > 10) fechaCita = fechaCita.slice(0,10);
            const estado = (c.Confirmado || c.confirmado || c.Estado || c.estado || c.status || '') as string;
            const isCanceled = String(estado).toLowerCase() === 'cancelada' || String(estado).toLowerCase() === 'cancelado';
            return fechaCita === date && !isCanceled;
          })
          .map((c: any) => {
            let hora = c.Hora || c.hora || c.time;
            if (hora && hora.length >= 5) hora = hora.slice(0,5);
            return hora;
          });
        this.availableTimes = this.allTimes.filter(t => !ocupadas.includes(t));
        console.log('[SecretaryDashboard] updateAvailableTimes', { doctorId, date, ocupadas, availableTimes: this.availableTimes });
      },
      error: (err) => {
        console.error('Error obteniendo citas por doctor', err);
        this.availableTimes = [...this.allTimes];
      }
    });
  }

  prevPage(): void { if (this.page > 1) { this.page--; this.loadAppointments(); } }
  nextPage(): void { this.page++; this.loadAppointments(); }
}
