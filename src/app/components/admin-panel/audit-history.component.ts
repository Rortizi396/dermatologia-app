import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audit-history',
  template: `
    <div class="audit-history card p-3">

      <div class="tabs mb-3" role="tablist" aria-label="Tipo de historial">
        <button type="button" class="tab-btn" [class.active]="activeTab==='users'" (click)="setTab('users')" aria-pressed="{{activeTab==='users'}}">Usuarios</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='appointments'" (click)="setTab('appointments')" aria-pressed="{{activeTab==='appointments'}}">Citas</button>
      </div>

      <div class="filters mb-3 toolbar p-2">
        <div class="filter-row">
          <div class="filter-item">
            <label class="filter-label">Evento</label>
            <input class="form-control form-control-sm" placeholder="p.ej. appointment_cancel" [(ngModel)]="filterEvent" />
          </div>
          <div class="filter-item">
            <label class="filter-label">Resource ID</label>
            <input class="form-control form-control-sm" placeholder="ID" [(ngModel)]="filterResourceId" />
          </div>
          <div class="filter-item">
            <label class="filter-label">Cambiado por</label>
            <input class="form-control form-control-sm" placeholder="email" [(ngModel)]="filterChangedBy" />
          </div>
          <div class="filter-item">
            <label class="filter-label">Desde</label>
            <input type="date" class="form-control form-control-sm" [(ngModel)]="filterSince" />
          </div>
          <div class="filter-item">
            <label class="filter-label">Hasta</label>
            <input type="date" class="form-control form-control-sm" [(ngModel)]="filterUntil" />
          </div>
          <div class="filter-item" style="min-width:90px">
            <label class="filter-label">Límite</label>
            <input type="number" class="form-control form-control-sm" min="1" max="1000" [(ngModel)]="filterLimit" />
          </div>
          <div class="filter-actions">
            <button class="btn btn-sm btn-primary" (click)="applyFilters()">Aplicar</button>
            <button class="btn btn-sm btn-secondary" (click)="clearFilters()">Limpiar</button>
            <button class="btn btn-sm btn-success" (click)="load()" title="Actualizar la tabla con los últimos eventos">Actualizar</button>
          </div>
        </div>
      </div>

      <div *ngIf=\"activeTab==='users'\" class="audit-table-wrap">
        <table class="table table-sm audit-table table-modern table-card">
          <thead>
            <tr>
              <th style="width:56px">ID</th>
              <th style="width:140px">Evento</th>
              <th style="width:140px">Recurso</th>
              <th>Old</th>
              <th>New</th>
              <th style="width:120px">Usuario</th>
              <th style="width:140px">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of records">
              <td class="cell-id">{{ r.id }}</td>
              <td>
                <span class="badge event-badge {{ getEventBadgeClass(r) }}">{{ getEventLabel(r) }}</span>
              </td>
              <td>
                <small class="text-muted">{{ r.resource_type }}</small>
                <div class="text-nowrap"><strong>#{{ r.resource_id }}</strong></div>
              </td>
              <td>
                <div class="cell-preview"><pre class="m-0 small">{{ r.old_preview || '-' }}</pre></div>
              </td>
              <td>
                <div class="cell-preview"><pre class="m-0 small">{{ r.new_preview || '-' }}</pre></div>
              </td>
              <td><div class="text-truncate" title="{{ r.changed_by }}">{{ r.changed_by || 'anonymous' }}</div></td>
              <td>{{ r.created_at | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf=\"activeTab==='appointments'\" class="audit-table-wrap">
        <table class="table table-sm audit-table table-modern table-card">
          <thead>
            <tr>
              <th style="width:56px">ID</th>
              <th style="width:140px">Evento</th>
              <th style="width:140px">Recurso</th>
              <th>Old</th>
              <th>New</th>
              <th style="width:120px">Usuario</th>
              <th style="width:140px">Fecha</th>
              <th style="width:110px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of records">
              <td class="cell-id">{{ r.id }}</td>
              <td><span class="badge event-badge {{ getEventBadgeClass(r) }}">{{ getEventLabel(r) }}</span></td>
              <td>
                <small class="text-muted">{{ r.resource_type }}</small>
                <div class="text-nowrap"><strong>#{{ r.resource_id }}</strong></div>
              </td>
              <td><div class="cell-preview"><pre class="m-0 small">{{ r.old_preview || '-' }}</pre></div></td>
              <td><div class="cell-preview"><pre class="m-0 small">{{ r.new_preview || '-' }}</pre></div></td>
              <td><div class="text-truncate" title="{{ r.changed_by }}">{{ r.changed_by || 'anonymous' }}</div></td>
              <td>{{ r.created_at | date:'short' }}</td>
              <td>
                <div class="d-flex">
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="undo(r.id)" [disabled]="undoing[r.id]">
                    <span *ngIf="!undoing[r.id]">Deshacer</span>
                    <span *ngIf="undoing[r.id]">Deshaciendo...</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .audit-history { background: var(--surface-1); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-1); }
    .audit-table { table-layout: fixed; width: 100%; }
    .audit-table th, .audit-table td { vertical-align: top; padding: .5rem; }
    .audit-table td .cell-preview { max-height: 6.5em; overflow: auto; background: var(--surface-2); border-radius: 6px; padding: .35rem; border: 1px solid var(--border-color); }
    .audit-table td .cell-preview pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace; font-size: .8rem; color: var(--text-dark); }
    /* Dark-mode: make previews dark with light text */
    [data-theme='dark'] .audit-table td .cell-preview { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
    [data-theme='dark'] .audit-table td .cell-preview pre { color: #e5e7eb; }
    .text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 768px) {
      .audit-table thead { display: none; }
      .audit-table, .audit-table tbody, .audit-table tr, .audit-table td { display: block; width: 100%; }
      .audit-table tr { margin-bottom: .75rem; border-bottom: 1px solid #e9ecef; }
      .audit-table td { text-align: left; padding-left: 0; }
      .cell-id { font-weight: 600; }
    }
    .filter-label { display:block; font-size: .78rem; color: var(--text-light); margin-bottom: .35rem; }
  .audit-history { border: 1px solid var(--border-color); }
    .event-badge { padding: .35rem .6rem; border-radius: 999px; font-weight:600; font-size:.82rem; }
    .event-badge.confirm { background: linear-gradient(90deg, var(--light-green), var(--primary-green)); color: #fff; }
    .event-badge.cancel { background: linear-gradient(90deg, #ffb3b3, var(--danger)); color: #fff; }
    .event-badge.create { background: linear-gradient(90deg, var(--lighter-green), var(--light-green)); color: #fff; }
    .event-badge.edit { background: linear-gradient(90deg, #f0f0f0, #dfe6e0); color: var(--text-dark); }
    /* Tabs */
    .tabs { display:flex; gap: .5rem; }
    .tab-btn { background: transparent; border: 1px solid transparent; padding: .5rem .9rem; border-radius: 8px; cursor: pointer; font-weight:600; }
    .tab-btn.active { background: linear-gradient(90deg, var(--lighter-green), var(--light-green)); color: #fff; border-color: rgba(0,0,0,0.05); }

    /* Filters in a horizontal row */
    .filter-row { display:flex; gap: .75rem; align-items:flex-end; flex-wrap:wrap; }
    .filter-item { min-width: 160px; display:flex; flex-direction:column; }
    .filter-actions { display:flex; gap:.5rem; align-items:center; }
    @media (max-width: 920px) {
      .filter-item { min-width: 140px; }
    }
    @media (max-width: 640px) {
      .filter-row { flex-direction:column; align-items:stretch; }
      .filter-actions { justify-content:flex-start; }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AuditHistoryComponent implements OnInit {
  records: any[] = [];
  activeTab: 'users'|'appointments' = 'appointments';
  undoing: Record<number, boolean> = {} as any;
  // Use runtime API base to work on GitHub Pages and local dev
  private apiBase = ((window as any).__env && (window as any).__env.apiUrl) ? (window as any).__env.apiUrl : '/api';
  // filters
  filterEvent: string | null = null;
  filterResourceId: string | null = null;
  filterChangedBy: string | null = null;
  filterSince: string | null = null; // ISO date
  filterUntil: string | null = null; // ISO date
  filterLimit = 200;
  constructor(private http: HttpClient) {}
  ngOnInit(): void { this.load(); }
  setTab(t: 'users'|'appointments') {
    this.activeTab = t; this.load();
  }
  load() {
    const resource = this.activeTab === 'users' ? 'user' : 'appointment';
    const params: string[] = [];
    params.push(`resource=${resource}`);
    if (this.filterEvent) params.push(`event=${encodeURIComponent(this.filterEvent)}`);
    if (this.filterResourceId) params.push(`resource_id=${encodeURIComponent(this.filterResourceId)}`);
    if (this.filterChangedBy) params.push(`user=${encodeURIComponent(this.filterChangedBy)}`);
    if (this.filterSince) params.push(`since=${encodeURIComponent(this.filterSince)}`);
    if (this.filterUntil) params.push(`until=${encodeURIComponent(this.filterUntil)}`);
    params.push(`limit=${encodeURIComponent(String(this.filterLimit || 200))}`);
    // cache-bust param to avoid intermediary caches
    params.push(`_=${Date.now()}`);
    const q = `${this.apiBase}/audit?${params.join('&')}`;
    this.http.get<any>(q, { headers: { 'Accept': 'application/json' } }).subscribe({
      next: (r) => { if (r && r.success) this.records = r.data || []; },
      error: (e) => { console.error('Error loading audit', e); }
    });
  }
  applyFilters() { this.load(); }
  clearFilters() {
    this.filterEvent = null; this.filterResourceId = null; this.filterChangedBy = null; this.filterSince = null; this.filterUntil = null; this.filterLimit = 200; this.load();
  }
  // Map event_type values to readable Spanish labels
  getEventLabel(r: any) {
    const raw = String(r.event_type || '').toLowerCase();
    // If resource is user show user-specific labels
    if ((r.resource_type || '').toLowerCase() === 'user' || this.activeTab === 'users') {
      if (raw.includes('create') || raw.includes('user_create')) return 'Creación usuario';
      if (raw.includes('update') || raw.includes('edit') || raw.includes('user_update')) return 'Edición usuario';
      if (raw.includes('delete') || raw.includes('inactivate')) return 'Eliminación usuario';
      return raw;
    }
    // appointments mapping - remove 'appointment_' prefix if present
    const cleaned = raw.replace(/^appointment_?/, '');
    if (cleaned.includes('create')) return 'Creación cita';
    if (cleaned.includes('confirm')) return 'Confirmación cita';
    if (cleaned.includes('cancel')) return 'Cancelación cita';
    if (cleaned.includes('undo')) return 'Deshacer cita';
    return cleaned || raw;
  }

  // Return badge class based on event
  getEventBadgeClass(r: any) {
    const label = this.getEventLabel(r).toLowerCase();
    if (label.includes('confirm')) return 'confirm';
    if (label.includes('cancel')) return 'cancel';
    if (label.includes('creación') || label.includes('creacion') || label.includes('create')) return 'create';
    if (label.includes('edici') || label.includes('edit')) return 'edit';
    return 'create';
  }
  undo(auditId: number) {
    if (!confirm('¿Seguro que quieres deshacer este cambio de cita?')) return;
    this.undoing[auditId] = true;
    this.http.post<any>(`${this.apiBase}/audit/${auditId}/undo`, {}, { headers: { 'Accept': 'application/json' } }).subscribe({
      next: (r) => { this.undoing[auditId] = false; this.load(); alert(r && r.message ? r.message : 'Deshecho'); },
      error: (e) => {
        console.error('Undo failed', e);
        // If proxy returned 404 or network error, try direct backend to help diagnose
        const status = e && e.status ? e.status : 0;
        if (status === 404 || status === 0) {
          // Retry using the resolved apiBase without hash routing issues
          console.warn('Retrying undo directly against configured backend', this.apiBase);
          this.http.post<any>(`${this.apiBase}/audit/${auditId}/undo`, {}, { headers: { 'Accept': 'application/json' } }).subscribe({
            next: (r2) => { this.undoing[auditId] = false; this.load(); alert(r2 && r2.message ? r2.message : 'Deshecho (directo)'); },
            error: (e2) => { this.undoing[auditId] = false; console.error('Direct undo failed', e2); alert('Error al deshacer (directo): ' + (e2?.error?.message || e2.message || e2)); }
          });
        } else {
          this.undoing[auditId] = false;
          alert('Error al deshacer: ' + (e?.error?.message || e.message || e));
        }
      }
    });
  }
}
