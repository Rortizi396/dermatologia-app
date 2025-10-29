import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { normalizeAppointment } from '../../utils/appointment-normalizer.util';
import { AppointmentService } from '../../services/appointment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-appointments.component.html',
  styleUrls: ['./admin-appointments.component.css']
})
export class AdminAppointmentsComponent implements OnInit {
  today = new Date();

  citasHoy: any[] = [];
  citasProximas: any[] = [];
  citasPendientes: any[] = [];
  citasConfirmadas: any[] = [];
  citasCanceladas: any[] = [];

  totalHoy = 0;
  totalProx = 0;
  totalPendientes = 0;
  totalConfirmadas = 0;
  totalCanceladas = 0;

  page = 1;
  limit = 50;

  actionModalOpen = false;
  actionType: 'confirm' | 'cancel' | null = null;
  actionTarget: any = null;
  actionLoading = false;

  constructor(private svc: AppointmentService, private toast: ToastService) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(){
    this.loadToday();
    this.loadProximas();
    this.loadByStatus('pendiente');
    this.loadByStatus('confirmada');
    this.loadByStatus('cancelada');
  }

  private toYMD(d: Date){ return d.toISOString().slice(0,10); }

  loadToday(){
    const date = this.toYMD(new Date());
    this.svc.getCitasPaged(1, this.limit, date).subscribe({
      next: (r:any) => {
  this.citasHoy = (r?.data || []).map((c:any) => normalizeAppointment(c));
  this.fetchMissingDates(this.citasHoy);
        this.totalHoy = r?.meta?.total ?? this.citasHoy.length;
      },
      error: (e) => console.error('loadToday', e)
    });
  }

  loadProximas(){
    const start = new Date(); start.setDate(start.getDate() + 1);
    const end = new Date(); end.setDate(end.getDate() + 7);
    this.svc.getCitasByRangePaged(this.toYMD(start), this.toYMD(end), 1, this.limit).subscribe({
      next: (r:any) => {
  this.citasProximas = (r?.data || []).map((c:any) => normalizeAppointment(c));
  this.fetchMissingDates(this.citasProximas);
        this.totalProx = r?.meta?.total ?? this.citasProximas.length;
      },
      error: (e) => console.error('loadProximas', e)
    });
  }

  loadByStatus(status: string){
    this.svc.getCitasByStatusPaged(status, 1, this.limit).subscribe({
      next: (r:any) => {
  const data = (r?.data || []).map((c:any) => normalizeAppointment(c));
  this.fetchMissingDates(data);
        if(status === 'pendiente'){ this.citasPendientes = data; this.totalPendientes = r?.meta?.total ?? data.length; }
        if(status === 'confirmada'){ this.citasConfirmadas = data; this.totalConfirmadas = r?.meta?.total ?? data.length; }
        if(status === 'cancelada'){ this.citasCanceladas = data; this.totalCanceladas = r?.meta?.total ?? data.length; }
      },
      error: (e) => console.error('loadByStatus', status, e)
    });
  }

  // For any appointments missing fecha/hora in a list, fetch full details by id and merge them.
  private fetchMissingDates(items: any[]){
    if(!Array.isArray(items) || items.length === 0) return;
    // Also fetch when 'numero' is missing in list responses. Some backend list endpoints omit Fecha/Hora or CitaNumero.
    const needFetch = items.filter(i => {
      if(!i) return false;
      const missingFecha = (!i.fecha || i.fecha === '-');
      const missingNumero = !(i.numero ?? i.CitaNumero ?? i.Cita_Numero ?? i.Cita_Num ?? null);
      const hasId = !!(i.idCitas || i.idcitas || i.id);
      return hasId && (missingFecha || missingNumero);
    });
  if(needFetch.length === 0) return;
    const calls = needFetch.map(i => {
      const id = i.idCitas ?? i.idcitas ?? i.id ?? null;
      if(!id) return of(null);
      return this.svc.getAppointmentById(id).pipe(
        // map to object { id, appointment }
        // we don't import map here to keep changes minimal; use subscribe later
      );
    });
    // forkJoin only on real observables; replace nulls with of(null)
    forkJoin(calls).subscribe((results: any[]) => {
      results.forEach((res, idx) => {
        if(!res) return;
        const app = (res && res.appointment) ? res.appointment : res;
        try {
          const id = app.idCitas ?? app.idcitas ?? app.id ?? null;
          const targetIdx = items.findIndex(it => (it.idCitas ?? it.idcitas ?? it.id) == id);
          if(targetIdx >= 0){
            const merged = normalizeAppointment({ ...items[targetIdx], ...app });
            items[targetIdx] = merged;
          }
        } catch(e) { console.warn('fetchMissingDates merge failed', e); }
      });
    }, (err) => { console.warn('fetchMissingDates failed', err); });
  }

  // Use shared normalizeAppointment util instead of local implementation

  // Obtener teléfono canónico desde la cita (varios aliases)
  getPhone(c:any){
    if(!c) return null;
    return c.pacienteInfo?.telefono ?? c.patientPhone ?? c.patientphone ?? c.pacienteTelefono ?? c.pacientePhone ?? c.telefono ?? null;
  }

  // Formatea un teléfono para mostrarlo: elimina caracteres no numéricos y deja una separación antes de los últimos 4 dígitos.
  formatPhone(raw: any){
    if(!raw && raw !== 0) return '-';
    let s = String(raw).trim();
    if(s.length === 0) return '-';
    const leadingPlus = s.startsWith('+');
    // mantener sólo dígitos
    s = s.replace(/[^0-9]/g, '');
    if(s.length === 0) return '-';
    // si tenía +, recuperarlo
    let digits = s;
    // separar antes de los últimos 4 dígitos para mejorar legibilidad
    if(digits.length <= 4) return (leadingPlus ? '+' : '') + digits;
    const last4 = digits.slice(-4);
    const rest = digits.slice(0, -4);
    // poner un espacio entre el resto y los últimos 4
    const formatted = rest + ' ' + last4;
    return (leadingPlus ? '+' : '') + formatted;
  }

  isPendiente(c: any){
    if(!c) return false;
    const s = c.Confirmado ?? c.confirmado ?? c.estado ?? null;
    if(s == null) return true;
    if(typeof s === 'string') return s.toLowerCase().includes('pend');
    return !s;
  }

  isConfirmada(c: any){
    const s = c.Confirmado ?? c.confirmado ?? c.estado ?? null;
    if(s == null) return false;
    return (typeof s === 'string' && s.toLowerCase().includes('conf')) || s === true;
  }

  isCancelada(c: any){
    const s = c.Confirmado ?? c.confirmado ?? c.estado ?? null;
    if(s == null) return false;
    return (typeof s === 'string' && s.toLowerCase().includes('can')) || s === false;
  }

  formatEstado(c: any){
    if(this.isConfirmada(c)) return 'Confirmada';
    if(this.isCancelada(c)) return 'Cancelada';
    return 'Pendiente';
  }

  openActionModal(type: 'confirm' | 'cancel', target: any){
    this.actionType = type;
    // If fecha/hora are missing but we can resolve an ID, fetch full appointment details first
    const id = target?.idCitas ?? target?.idcitas ?? target?.id ?? target?.Id ?? target?.CitaId ?? target?.citaId ?? null;
    if (id && (!target?.fecha && !target?.Fecha && !target?.hora && !target?.Hora)) {
      // show loading in modal placeholder
      this.actionLoading = true;
      this.svc.getAppointmentById(id).subscribe({
        next: (resp: any) => {
            try {
              const app = (resp && resp.appointment) ? resp.appointment : resp;
              // merge fetched data into target
              const merged = { ...target, ...app };
              this.actionTarget = normalizeAppointment(merged);
            } catch (e) {
              console.warn('Failed to merge appointment details', e);
              this.actionTarget = normalizeAppointment(target);
            }
          this.actionLoading = false;
          this.actionModalOpen = true;
        },
        error: (e) => {
          console.warn('Failed to fetch full appointment details', e);
          this.actionLoading = false;
          this.actionTarget = normalizeAppointment(target);
          this.actionModalOpen = true;
        }
      });
    } else {
      this.actionTarget = normalizeAppointment(target);
      this.actionModalOpen = true;
    }
  }
  closeActionModal(){ this.actionModalOpen = false; this.actionType = null; this.actionTarget = null; this.actionLoading = false; }

  performAction(){
    if(!this.actionType || !this.actionTarget) return;
    this.actionLoading = true;
    const id = this.actionTarget.idCitas ?? this.actionTarget.id ?? this.actionTarget.Id ?? this.actionTarget.CitaId ?? this.actionTarget.citaId;
    if(!id){ this.toast.show('ID de cita no encontrado','error',3000); this.actionLoading = false; return; }
    // Log the resolved URL for debugging (svc.apiUrl is private, access via indexer as diagnostic)
    try {
      // diagnostic: we avoid noisy logs in production
      // const base = (this.svc as any)['apiUrl'] || (window as any).__env?.apiUrl || '/api';
      // console.log('[AdminAppointments] calling backend URL:', `${base}/appointments/${id}/${this.actionType === 'confirm' ? 'confirm' : 'cancel'}`);
    } catch (e) {}
    const obs = this.actionType === 'confirm' ? this.svc.confirmAppointment(id) : this.svc.cancelAppointment(id);
    obs.subscribe({
      next: () => {
        const msg = this.actionType === 'confirm' ? 'Cita confirmada' : 'Cita cancelada';
        this.toast.show(msg, 'success', 2500);
        this.actionLoading = false;
        this.closeActionModal();
        this.refreshAll();
      },
      error: (e:any) => { console.error('performAction', e); this.toast.show('Error al procesar la acción: ' + (e?.error?.message || e?.message || e.statusText || 'Error'), 'error', 5000); this.actionLoading = false; }
    });
  }
  }
