import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-appointments-2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-appointments p-2">
      <h3>Administración de citas (v2)</h3>

      <div class="grid">
        <section class="card">
          <header class="card-header">Hoy <small class="muted">({{ today | date:'dd/MM/yyyy' }})</small> <span class="badge">{{ totalHoy }}</span></header>
          <div class="card-body">
            <table class="table table-sm">
              <thead><tr><th>Paciente</th><th>Especialidad</th><th>Doctor</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                <tr *ngFor="let c of citasHoy">
                  <td>{{ c.paciente || '-' }}</td>
                  <td>{{ c.especialidadInfo?.Nombre || c.consulta_Especialidad || '-' }}</td>
                  <td>{{ c.doctorInfo?.nombres ? (c.doctorInfo.nombres + ' ' + (c.doctorInfo.apellidos||'')) : (c.profesional_Responsable || '-') }}</td>
                  <td>{{ formatEstado(c) }}</td>
                  <td>
                    <button *ngIf="isPendiente(c)" class="btn btn-sm btn-accept me-1" (click)="openActionModal('confirm', c)">Confirmar</button>
                    <button *ngIf="isPendiente(c)" class="btn btn-sm btn-cancel" (click)="openActionModal('cancel', c)">Cancelar</button>
                  </td>
                </tr>
                <tr *ngIf="citasHoy.length === 0"><td colspan="5" class="text-center text-muted">No hay citas hoy</td></tr>
              </tbody>
            </table>
          </div>
          <footer class="card-footer">
            <button class="btn btn-sm" (click)="changePage('hoy', -1)">Prev</button>
            <button class="btn btn-sm" (click)="changePage('hoy', 1)">Next</button>
          </footer>
        </section>

        <section class="card">
          <header class="card-header">Próximas 7 días <span class="badge">{{ totalProx }}</span></header>
          <div class="card-body">
            <table class="table table-sm">
              <thead><tr><th>Fecha</th><th>Paciente</th><th>Especialidad</th><th>Doctor</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                <tr *ngFor="let c of citasProximas">
                  <td>{{ c.fecha | date:'dd/MM/yyyy' }}</td>
                  <td>{{ c.paciente || '-' }}</td>
                  <td>{{ c.especialidadInfo?.Nombre || '-' }}</td>
                  <td>{{ c.doctorInfo?.nombres ? (c.doctorInfo.nombres + ' ' + (c.doctorInfo.apellidos||'')) : (c.profesional_Responsable || '-') }}</td>
                  <td>{{ formatEstado(c) }}</td>
                  <td>
                    <button *ngIf="isPendiente(c)" class="btn btn-sm btn-accept me-1" (click)="openActionModal('confirm', c)">Confirmar</button>
                    <button *ngIf="isPendiente(c)" class="btn btn-sm btn-cancel" (click)="openActionModal('cancel', c)">Cancelar</button>
                  </td>
                </tr>
                <tr *ngIf="citasProximas.length === 0"><td colspan="6" class="text-center text-muted">No hay citas próximas</td></tr>
              </tbody>
            </table>
          </div>
          <footer class="card-footer">
            <button class="btn btn-sm" (click)="changePage('prox', -1)">Prev</button>
            <button class="btn btn-sm" (click)="changePage('prox', 1)">Next</button>
          </footer>
        </section>
      </div>

      <div *ngIf="actionModalOpen" class="modal-overlay">
        <div class="modal card p-3">
          <h5>{{ actionTitle }}</h5>
          <p class="muted">{{ actionMessage }}</p>
          <div class="d-flex justify-content-end">
            <button class="btn btn-sm btn-outline-secondary me-2" (click)="closeActionModal()" [disabled]="actionLoading">Cancelar</button>
            <button class="btn btn-sm btn-primary" (click)="performAction()" [disabled]="actionLoading">{{ actionLoading ? 'Procesando...' : 'Confirmar' }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:1rem; }
    .card { border-radius:8px; overflow:hidden; border:1px solid #e7e7e7 }
    .card-header { background:#f5f5f5; padding:.6rem .9rem; font-weight:600; display:flex; justify-content:space-between; align-items:center }
    .card-body { padding:.5rem }
    .card-footer { padding:.4rem .6rem; display:flex; justify-content:flex-end; gap:.4rem }
    .badge { background:#f0f0f0; padding:.2rem .5rem; border-radius:999px }
    .muted { color:#777 }
    .modal-overlay { position:fixed; left:0; right:0; top:0; bottom:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.25); z-index:2000 }
    .modal { width:420px; max-width:95% }
    .btn-accept { background:#2e7d32; color:#fff; border:none }
    .btn-cancel { background:#c62828; color:#fff; border:none }
    `
  ]
})
export class AdminAppointments2Component implements OnInit {
  today = new Date();
  citasHoy: any[] = [];
  citasProximas: any[] = [];

  totalHoy = 0; totalProx = 0;

  pageHoy = 1; limitHoy = 25;
  pageProx = 1; limitProx = 25;

  actionModalOpen = false;
  actionType: 'confirm' | 'cancel' | null = null;
  actionTarget: any = null;
  actionLoading = false;

  constructor(private svc: AppointmentService, private toast: ToastService) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll() { this.loadHoy(); this.loadProximas(); }

  loadHoy() { const date = this.toYMD(new Date()); this.svc.getCitasPaged(this.pageHoy, this.limitHoy, date).subscribe({ next:(r:any)=>{ this.citasHoy = r.data || []; this.totalHoy = r.meta?.total || 0 }, error:e=>console.error(e) }); }
  loadProximas() { const start=new Date(); start.setDate(start.getDate()+1); const end=new Date(); end.setDate(end.getDate()+7); this.svc.getCitasByRangePaged(this.toYMD(start), this.toYMD(end), this.pageProx, this.limitProx).subscribe({ next:(r:any)=>{ this.citasProximas = r.data || []; this.totalProx = r.meta?.total || 0 }, error:e=>console.error(e) }); }

  changePage(section:string, delta:number){ switch(section){ case 'hoy': this.pageHoy=Math.max(1,this.pageHoy+delta); this.loadHoy(); break; case 'prox': this.pageProx=Math.max(1,this.pageProx+delta); this.loadProximas(); break; } }

  toYMD(d:Date){ return d.toISOString().slice(0,10); }

  isPendiente(c:any){ return !c.Confirmado || (typeof c.Confirmado==='string' && c.Confirmado.toLowerCase().includes('pend')); }
  isConfirmada(c:any){ return c.Confirmado && typeof c.Confirmado==='string' && c.Confirmado.toLowerCase().includes('conf'); }
  isCancelada(c:any){ return c.Confirmado && typeof c.Confirmado==='string' && c.Confirmado.toLowerCase().includes('can'); }

  formatEstado(c:any){ if(this.isConfirmada(c)) return 'Confirmada'; if(this.isCancelada(c)) return 'Cancelada'; return 'Pendiente'; }

  get actionTitle(){ if(!this.actionType) return ''; return this.actionType==='confirm' ? 'Confirmar cita' : 'Cancelar cita'; }
  get actionMessage(){ if(!this.actionTarget) return ''; const paciente = this.actionTarget.pacienteInfo?.nombres ? this.actionTarget.pacienteInfo.nombres+' '+(this.actionTarget.pacienteInfo.apellidos||'') : (this.actionTarget.paciente||'-'); return `${this.actionType==='confirm' ? 'Confirmar' : 'Cancelar'} la cita de ${paciente} para el ${this.actionTarget.fecha ? (new Date(this.actionTarget.fecha)).toLocaleString():'fecha desconocida'}?`; }

  openActionModal(type:'confirm'|'cancel', target:any){ this.actionType=type; this.actionTarget=target; this.actionModalOpen=true; }
  closeActionModal(){ this.actionModalOpen=false; this.actionType=null; this.actionTarget=null; this.actionLoading=false; }

  performAction(){
    if(!this.actionType||!this.actionTarget) return;
    this.actionLoading=true;
    const id = this.actionTarget.id || this.actionTarget.Id || this.actionTarget.CitaId;
    const obs = this.actionType==='confirm' ? this.svc.confirmAppointment(id) : this.svc.cancelAppointment(id);
    obs.subscribe({
      next: (res:any) => {
        const msg = this.actionType==='confirm' ? 'Cita confirmada' : 'Cita cancelada';
        this.toast.show(msg, 'success', 2500);
        this.actionLoading=false;
        this.closeActionModal();
        this.loadAll();
      },
      error: (e) => {
        console.error(e);
        this.toast.show('Error al procesar la acción', 'error', 3500);
        this.actionLoading=false;
      }
    });
  }
}

