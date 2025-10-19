import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  timeString = '';
  dateString = '';
  use24Hour = true;
  private _clockInterval: any = null;
  private _refreshInterval: any = null;

  // Mission & Vision
  missionText: string = '';
  visionText: string = '';

  doctorId: any = null;
  appointments: any[] = [];
  loading = false;

  constructor(
    private auth: AuthService,
    private appointmentService: AppointmentService,
    private toast: ToastService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.startClock();
    this.loadUser();
    // refrescar citas cada 15 segundos
    this._refreshInterval = setInterval(() => { this.loadTodayAppointments(); }, 15000);
    this.loadMissionVision();
  }

  private loadMissionVision(): void {
    try { this.http.get<any>('/api/settings/mission').subscribe({ next: (r: any) => { this.missionText = r && r.value ? r.value : ''; }, error: (e) => { console.error('Error loading mission for doctor dashboard', e); this.missionText = ''; } }); } catch(e){ console.warn(e); }
    try { this.http.get<any>('/api/settings/vision').subscribe({ next: (r: any) => { this.visionText = r && r.value ? r.value : ''; }, error: (e) => { console.error('Error loading vision for doctor dashboard', e); this.visionText = ''; } }); } catch(e){ console.warn(e); }
  }

  ngOnDestroy(): void {
    if (this._clockInterval) clearInterval(this._clockInterval);
    if (this._refreshInterval) clearInterval(this._refreshInterval);
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

  private loadUser(): void {
    const u = this.auth.currentUserValue;
    if (!u) return;
    // Try common fields for doctor id
  this.doctorId = (u?.id || (u as any)?.userId || (u as any)?._id || (u as any)?.doctorId || ((u as any)?.usuarioId && (u as any).usuarioId.id) || null);
  // as a fallback, if the user object has other numeric id field
  if (!this.doctorId && (u as any)?.dpi) this.doctorId = (u as any).dpi;
    this.loadTodayAppointments();
  }

  private formatDateIso(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  loadTodayAppointments(): void {
    this.loading = true;
    console.log('[DoctorDashboard] loadTodayAppointments doctorId=', this.doctorId);
    const today = new Date();
    const todayIso = this.formatDateIso(today);

    const handleCitas = (citasRaw: any) => {
      const citas = Array.isArray(citasRaw) ? citasRaw : (citasRaw.citas || citasRaw.data || citasRaw);
      this.appointments = (citas || []).filter((c: any) => {
        const fechaStr = c.Fecha || c.fecha || c.date || '';
        return this.isSameDate(fechaStr, today);
      }).sort((a: any, b: any) => ((a.hora||a.Hora||a.time||'').localeCompare(b.hora||b.Hora||b.time||'')));
    };

    if (this.doctorId) {
      this.appointmentService.getCitasPorDoctor(this.doctorId).subscribe({
        next: (resp: any) => {
          console.log('[DoctorDashboard] getCitasPorDoctor resp=', resp);
          handleCitas(resp);
          // If no citas returned for the doctorId, attempt fallback by searching paged citas
          if (!this.appointments || this.appointments.length === 0) {
            console.log('[DoctorDashboard] no citas from getCitasPorDoctor, trying paged fallback by email/name');
            const user = this.auth.currentUserValue;
            const emailCandidates = this.getUserEmailCandidates(user);
            const nameCandidates = this.getUserNameCandidates(user);
            this.appointmentService.getCitasPaged(1, 500).subscribe({
              next: (paged: any) => {
                console.log('[DoctorDashboard] fallback getCitasPaged resp length=', (paged && paged.data && paged.data.length) || (Array.isArray(paged) ? paged.length : 0));
                const rawPaged = Array.isArray(paged) ? paged : (paged.data || paged.citas || paged);
                const filtered = (rawPaged || []).filter((c: any) => {
                  // date must be today
                  if (!this.isSameDate(c.Fecha || c.fecha || c.date || '', today)) return false;
                  // try match by email present in appointment fields
                  const prof = String(c.Profesional_Responsable || c.profesional_Responsable || c.profesional || c.profesionalId || '').toLowerCase();
                  const profEmail = String(c.profesionalEmail || c.doctorEmail || c.email || '').toLowerCase();
                  const matchesEmail = emailCandidates.some(e => e && prof.includes(String(e).toLowerCase())) || emailCandidates.some(e => e && profEmail.includes(String(e).toLowerCase()));
                  if (matchesEmail) return true;
                  // try match by doctor name
                  const profName = String(c.doctorNombres || c.doctorNombre || c.doctorName || c.nombreProfesional || c.ProfesionalNombre || '').toLowerCase();
                  const matchesName = nameCandidates.some(n => n && profName.includes(String(n).toLowerCase()));
                  if (matchesName) return true;
                  // try match by Colegiado field if present
                  const colegiado = String(c.Colegiado || c.colegiado || c.colegiadoId || c.colegiado_numero || '').toLowerCase();
                  const uAny = user as any;
                  const userColegiado = (uAny && (uAny['colegiado'] || uAny['Colegiado'] || uAny['colegiadoNum'] || uAny['colegiado_numero'])) ? String(uAny['colegiado'] || uAny['Colegiado'] || uAny['colegiadoNum'] || uAny['colegiado_numero']).toLowerCase() : null;
                  if (userColegiado && colegiado && userColegiado === colegiado) return true;
                  return false;
                });
                this.appointments = filtered.sort((a: any, b: any) => ((a.hora||a.Hora||a.time||'').localeCompare(b.hora||b.Hora||b.time||'')));
                console.log('[DoctorDashboard] fallback filtered appointments length=', this.appointments.length);
                this.loading = false;
              },
              error: (e) => { console.error(e); this.toast.show('Error buscando citas en fallback'); this.loading = false; }
            });
          } else {
            this.loading = false;
          }
        },
        error: (e) => { console.error(e); this.toast.show('Error cargando citas por doctor'); this.loading = false; }
      });
    } else {
      // Fallback: request paged citas and filter by potential doctor identifiers
      this.appointmentService.getCitasPaged(1, 500).subscribe({
        next: (resp: any) => {
          console.log('[DoctorDashboard] getCitasPaged resp length=', (resp && resp.data && resp.data.length) || (Array.isArray(resp) ? resp.length : 0));
          const candidates = this.getUserIdCandidates(this.auth.currentUserValue);
          console.log('[DoctorDashboard] user id candidates=', candidates);
          const raw = Array.isArray(resp) ? resp : (resp.data || resp.citas || resp);
          const filtered = (raw || []).filter((c: any) => {
            const prof = c.Profesional_Responsable || c.profesional_Responsable || c.Profesional || c.profesional || c.profesionalResponsable || c.profesional_responsable || c.profesionalId || c.profesional;
            return candidates.some(x => x !== null && String(x) === String(prof)) && this.isSameDate(c.Fecha || c.fecha || c.date || '', today);
          });
          this.appointments = filtered.sort((a: any, b: any) => ((a.hora||a.Hora||a.time||'').localeCompare(b.hora||b.Hora||b.time||'')));
          this.loading = false;
        },
        error: (e) => { console.error(e); this.toast.show('Error cargando citas'); this.loading = false; }
      });
    }
  }

  private isSameDate(fechaStr: string | undefined, dateObj: Date): boolean {
    if (!fechaStr) return false;
    try {
      const d = new Date(fechaStr);
      return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth() && d.getDate() === dateObj.getDate();
    } catch (e) { return false; }
  }

  private getUserIdCandidates(user: any): any[] {
    if (!user) return [null];
    const candidates = [] as any[];
    if (user.id) candidates.push(user.id);
    if ((user as any).dpi) candidates.push((user as any).dpi);
    if ((user as any).Profesional_Responsable) candidates.push((user as any).Profesional_Responsable);
    if ((user as any).profesional_Responsable) candidates.push((user as any).profesional_Responsable);
    if ((user as any).usuarioId && (user as any).usuarioId.id) candidates.push((user as any).usuarioId.id);
    if ((user as any).userId) candidates.push((user as any).userId);
    // remove duplicates
    return Array.from(new Set(candidates.filter(x => x !== undefined && x !== null)));
  }

  private getUserEmailCandidates(user: any): string[] {
    if (!user) return [];
    const emails: string[] = [];
    if (user.email) emails.push(String(user.email));
    if ((user as any).correo) emails.push(String((user as any).correo));
    if ((user as any).usuario && (user as any).usuario.email) emails.push(String((user as any).usuario.email));
    return Array.from(new Set(emails.filter(e => !!e)));
  }

  private getUserNameCandidates(user: any): string[] {
    if (!user) return [];
    const names: string[] = [];
    if (user.nombre) names.push(String(user.nombre));
    if (user.nombres) names.push(String(user.nombres));
    if (user.fullName) names.push(String(user.fullName));
    if ((user as any).usuario && ((user as any).usuario.nombre || (user as any).usuario.nombres)) names.push(String((user as any).usuario.nombre || (user as any).usuario.nombres));
    return Array.from(new Set(names.filter(n => !!n)));
  }

  // Helpers to map backend fields
  displayPatientName(a: any): string {
    if (!a) return '';
    const pn = a.pacienteNombres || a.pacienteNombre || (a.pacienteInfo && a.pacienteInfo.nombres) || a.Paciente || a.paciente;
    const pa = a.pacienteApellidos || (a.pacienteInfo && a.pacienteInfo.apellidos) || '';
    return ((pn || '') + ' ' + (pa || '')).trim();
  }
  displayTime(a: any): string { const h = a.hora || a.Hora || a.time || ''; return h ? h.slice(0,5) : ''; }
  displayDate(a: any): string {
    if (!a) return '';
    const ds = a.fecha || a.Fecha || a.date;
    if (!ds) return '';
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString();
  }
  getProfesionalResponsable(a: any): any { return a.Profesional_Responsable || a.profesional_Responsable || a.profesional || a.profesionalId || a.profesionalResponsable; }
}
