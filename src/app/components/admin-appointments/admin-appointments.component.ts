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
  imports: [CommonModule, FormsModule, NgIf, NgForOf],
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

  // Paginación UI por sección
  uiPageHoy = 1; uiLimitHoy = 10;
  uiPageProx = 1; uiLimitProx = 10;
  uiPagePend = 1; uiLimitPend = 10;
  uiPageConf = 1; uiLimitConf = 10;
  uiPageCanc = 1; uiLimitCanc = 10;

  actionModalOpen = false;
  actionType: 'confirm' | 'cancel' | null = null;
  actionTarget: any = null;
  actionLoading = false;
  // Búsqueda rápida global (filtra todas las secciones en cliente)
  searchTerm: string = '';

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
  // ---- Filtro/búsqueda en cliente ----
  private norm(v: any): string { try { return (v ?? '').toString().toLowerCase(); } catch { return ''; } }
  private citaToSearchText(c: any): string {
    if (!c) return '';
    const paciente = c.pacienteInfo ? `${c.pacienteInfo.nombres || ''} ${c.pacienteInfo.apellidos || ''}` : (c.pacienteNombre || c.paciente || c.pacienteInfo?.nombre || c.pacienteInfo?.fullName || '');
    const doctor = c.doctorInfo ? `${c.doctorInfo.nombres || ''} ${c.doctorInfo.apellidos || ''}` : (c.profesional_Responsable || '');
    const especialidad = c.especialidadInfo?.Nombre || c.consulta_Especialidad || '';
    const numero = c.numero || c.CitaNumero || c.Cita_Numero || c.idCitas || c.id || '';
    const tel = this.getPhone(c) || '';
    const estado = this.formatEstado(c) || '';
    const fecha = c.fecha || c.Fecha || '';
    const hora = c.hora || c.Hora || '';
    return this.norm(`${paciente} ${doctor} ${especialidad} ${numero} ${tel} ${estado} ${fecha} ${hora}`);
  }
  private filterList(list: any[]): any[] {
    const q = this.norm(this.searchTerm);
    if (!q) return list || [];
    return (list || []).filter(c => this.citaToSearchText(c).includes(q));
  }
  get filteredHoy(): any[] { return this.filterList(this.citasHoy); }
  get filteredProx(): any[] { return this.filterList(this.citasProximas); }
  get filteredPend(): any[] { return this.filterList(this.citasPendientes); }
  get filteredConf(): any[] { return this.filterList(this.citasConfirmadas); }
  get filteredCanc(): any[] { return this.filterList(this.citasCanceladas); }

  private toYMD(d: Date){ return d.toISOString().slice(0,10); }

  loadToday(){
    const date = this.toYMD(new Date());
    this.svc.getCitasPaged(1, this.limit, date).subscribe({
      next: (r:any) => {
  this.citasHoy = (r?.data || []).map((c:any) => normalizeAppointment(c));
  this.fetchMissingDates(this.citasHoy);
        this.totalHoy = r?.meta?.total ?? this.citasHoy.length;
        this.clampPage('hoy');
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
        this.clampPage('prox');
      },
      error: (e) => console.error('loadProximas', e)
    });
  }

  loadByStatus(status: string){
    this.svc.getCitasByStatusPaged(status, 1, this.limit).subscribe({
      next: (r:any) => {
  const data = (r?.data || []).map((c:any) => normalizeAppointment(c));
  this.fetchMissingDates(data);
        if(status === 'pendiente'){ this.citasPendientes = data; this.totalPendientes = r?.meta?.total ?? data.length; this.clampPage('pend'); }
        if(status === 'confirmada'){ this.citasConfirmadas = data; this.totalConfirmadas = r?.meta?.total ?? data.length; this.clampPage('conf'); }
        if(status === 'cancelada'){ this.citasCanceladas = data; this.totalCanceladas = r?.meta?.total ?? data.length; this.clampPage('canc'); }
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

  getStatusClass(c:any){
    if(this.isConfirmada(c)) return 'status-confirmada';
    if(this.isCancelada(c)) return 'status-cancelada';
    return 'status-pendiente';
  }

  // Paginación UI (cliente)
  private listLength(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    switch(section){
      case 'hoy': return this.filteredHoy.length;
      case 'prox': return this.filteredProx.length;
      case 'pend': return this.filteredPend.length;
      case 'conf': return this.filteredConf.length;
      case 'canc': return this.filteredCanc.length;
    }
  }
  getTotalPages(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    const limit = this.getUiLimit(section);
    const len = this.listLength(section);
    return Math.max(1, Math.ceil((len || 0) / (limit || 1)));
  }
  private getUiLimit(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    switch(section){
      case 'hoy': return this.uiLimitHoy;
      case 'prox': return this.uiLimitProx;
      case 'pend': return this.uiLimitPend;
      case 'conf': return this.uiLimitConf;
      case 'canc': return this.uiLimitCanc;
    }
  }
  private getUiPage(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    switch(section){
      case 'hoy': return this.uiPageHoy;
      case 'prox': return this.uiPageProx;
      case 'pend': return this.uiPagePend;
      case 'conf': return this.uiPageConf;
      case 'canc': return this.uiPageCanc;
    }
  }
  private setUiPage(section: 'hoy'|'prox'|'pend'|'conf'|'canc', page: number){
    switch(section){
      case 'hoy': this.uiPageHoy = page; break;
      case 'prox': this.uiPageProx = page; break;
      case 'pend': this.uiPagePend = page; break;
      case 'conf': this.uiPageConf = page; break;
      case 'canc': this.uiPageCanc = page; break;
    }
  }
  private setUiLimit(section: 'hoy'|'prox'|'pend'|'conf'|'canc', limit: number){
    switch(section){
      case 'hoy': this.uiLimitHoy = limit; break;
      case 'prox': this.uiLimitProx = limit; break;
      case 'pend': this.uiLimitPend = limit; break;
      case 'conf': this.uiLimitConf = limit; break;
      case 'canc': this.uiLimitCanc = limit; break;
    }
  }
  clampPage(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    const totalPages = this.getTotalPages(section);
    const curr = this.getUiPage(section) || 1;
    if(curr > totalPages) this.setUiPage(section, totalPages);
    if(curr < 1) this.setUiPage(section, 1);
  }
  prevPage(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    const curr = this.getUiPage(section) || 1;
    if(curr > 1) this.setUiPage(section, curr - 1);
  }
  nextPage(section: 'hoy'|'prox'|'pend'|'conf'|'canc'){
    const curr = this.getUiPage(section) || 1;
    const total = this.getTotalPages(section);
    if(curr < total) this.setUiPage(section, curr + 1);
  }
  changeLimit(section: 'hoy'|'prox'|'pend'|'conf'|'canc', val: any){
    const n = Number(val) || 10;
    this.setUiLimit(section, n);
    this.setUiPage(section, 1);
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
  // Utilidad para plantillas: mínimo entre dos números
  min(a:number, b:number){ return Math.min(a,b); }
  }
