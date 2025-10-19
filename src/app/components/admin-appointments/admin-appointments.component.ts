import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
        this.citasHoy = (r?.data || []).map((c:any) => this.normalizeAppointment(c));
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
        this.citasProximas = (r?.data || []).map((c:any) => this.normalizeAppointment(c));
        this.totalProx = r?.meta?.total ?? this.citasProximas.length;
      },
      error: (e) => console.error('loadProximas', e)
    });
  }

  loadByStatus(status: string){
    this.svc.getCitasByStatusPaged(status, 1, this.limit).subscribe({
      next: (r:any) => {
        const data = (r?.data || []).map((c:any) => this.normalizeAppointment(c));
        if(status === 'pendiente'){ this.citasPendientes = data; this.totalPendientes = r?.meta?.total ?? data.length; }
        if(status === 'confirmada'){ this.citasConfirmadas = data; this.totalConfirmadas = r?.meta?.total ?? data.length; }
        if(status === 'cancelada'){ this.citasCanceladas = data; this.totalCanceladas = r?.meta?.total ?? data.length; }
      },
      error: (e) => console.error('loadByStatus', status, e)
    });
  }

  // Normalizar objeto de cita para que las plantillas puedan depender de campos comunes
  private normalizeAppointment(c:any){
    if(!c || typeof c !== 'object') return c;
  // asegurar que idCitas exista
    c.idCitas = c.idCitas ?? c.id ?? c.Id ?? c.CitaId ?? c.citaId ?? null;
    // normalize number fields used in templates
    c.numero = c.numero ?? c.CitaNumero ?? c.idCitas ?? c.id ?? c.Id ?? c.nro ?? c.Nro ?? null;
    c.CitaNumero = c.CitaNumero ?? c.numero;
    return c;
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

  openActionModal(type: 'confirm' | 'cancel', target: any){ this.actionType = type; this.actionTarget = target; this.actionModalOpen = true; }
  closeActionModal(){ this.actionModalOpen = false; this.actionType = null; this.actionTarget = null; this.actionLoading = false; }

  performAction(){
    if(!this.actionType || !this.actionTarget) return;
    this.actionLoading = true;
  const id = this.actionTarget.idCitas ?? this.actionTarget.id ?? this.actionTarget.Id ?? this.actionTarget.CitaId ?? this.actionTarget.citaId;
    if(!id){ this.toast.show('ID de cita no encontrado','error',3000); this.actionLoading = false; return; }
    const obs = this.actionType === 'confirm' ? this.svc.confirmAppointment(id) : this.svc.cancelAppointment(id);
    obs.subscribe({
      next: () => {
        const msg = this.actionType === 'confirm' ? 'Cita confirmada' : 'Cita cancelada';
        this.toast.show(msg, 'success', 2500);
        this.actionLoading = false;
        this.closeActionModal();
        this.refreshAll();
      },
      error: (e:any) => { console.error('performAction', e); this.toast.show('Error al procesar la acción','error',3500); this.actionLoading = false; }
    });
  }
  }
