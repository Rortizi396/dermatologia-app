import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditHistoryComponent } from './audit-history.component';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, AuditHistoryComponent]
})
export class AdminPanelComponent {
  // default to no selection; user should choose from the sidebar
  view: 'none' | 'mission' | 'history' = 'none';
  selectedEntity: string = '';
  entities = [
    { key: 'pacientes', label: 'Pacientes' },
    { key: 'secretarias', label: 'Secretarias' },
    { key: 'doctores', label: 'Doctores' },
    { key: 'administradores', label: 'Administradores' }
  ];

  onSelectEntity(entity: string) {
    this.selectedEntity = entity;
  }

  // Site settings
  mission: string = '';
  vision: string = '';
  // UI states for individual forms
  isSavingMission: boolean = false;
  isSavingVision: boolean = false;
  // preserve original copies for cancel
  private originalMission: string = '';
  private originalVision: string = '';

  constructor(private http: HttpClient, private toast: ToastService, private route: ActivatedRoute) {
    this.loadSettings();
    // Read optional query param `view` so external links can open mission/history directly
    this.route.queryParams.subscribe(params => {
      const v = params['view'];
      if (v === 'mission' || v === 'history') {
        this.view = v;
      }
    });
  }

  loadSettings(): void {
  this.http.get<any>('/api/settings/mission').subscribe({
      next: (r) => { this.mission = r && r.value ? r.value : ''; },
      error: (e) => console.error('Error loading mission', e)
    });
  this.http.get<any>('/api/settings/vision').subscribe({
      next: (r) => { this.vision = r && r.value ? r.value : ''; },
      error: (e) => console.error('Error loading vision', e)
    });
  }

  // Helpers de guardar/cancelar para los formularios de misión/visión
  saveMission(): void {
    this.isSavingMission = true;
    // store original in case of cancel
    this.originalMission = this.originalMission || this.mission;
    this.http.put('/api/settings/mission', { value: this.mission }).subscribe({
      next: () => {
        this.toast.show('Misión guardada', 'success');
        this.isSavingMission = false;
        // update original
        this.originalMission = this.mission;
        // also record save of vision if needed
      },
      error: (e) => { console.error('Error saving mission', e); this.toast.show('Error al guardar misión', 'error'); this.isSavingMission = false; }
    });
  }

  cancelMission(): void {
  // recargar el original desde el servidor para asegurar la versión más reciente
    this.http.get<any>('/api/settings/mission').subscribe({
      next: (r) => { this.mission = r && r.value ? r.value : ''; this.toast.show('Cambios descartados', 'success'); },
      error: (e) => { console.error('Error reloading mission', e); this.toast.show('Error al recargar misión', 'error'); }
    });
  }

  saveVision(): void {
    this.isSavingVision = true;
    this.originalVision = this.originalVision || this.vision;
    this.http.put('/api/settings/vision', { value: this.vision }).subscribe({
      next: () => {
        this.toast.show('Visión guardada', 'success');
        this.isSavingVision = false;
        this.originalVision = this.vision;
      },
      error: (e) => { console.error('Error saving vision', e); this.toast.show('Error al guardar visión', 'error'); this.isSavingVision = false; }
    });
  }

  cancelVision(): void {
    this.http.get<any>('/api/settings/vision').subscribe({
      next: (r) => { this.vision = r && r.value ? r.value : ''; this.toast.show('Cambios descartados', 'success'); },
      error: (e) => { console.error('Error reloading vision', e); this.toast.show('Error al recargar visión', 'error'); }
    });
  }

  saveSettings(): void {
  this.http.put('/api/settings/mission', { value: this.mission }).subscribe({
      next: () => {
        this.toast.show('Misión guardada', 'success');
  this.http.put('/api/settings/vision', { value: this.vision }).subscribe({
          next: () => this.toast.show('Visión guardada', 'success'),
          error: (e) => { console.error('Error saving vision', e); this.toast.show('Error al guardar visión', 'error'); }
        });
      },
      error: (e) => { console.error('Error saving mission', e); this.toast.show('Error al guardar misión', 'error'); }
    });
  }
}
