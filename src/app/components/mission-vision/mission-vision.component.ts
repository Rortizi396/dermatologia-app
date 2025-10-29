import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-mission-vision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div>
    <h2>Contenido del sitio</h2>
    <div class="row">
      <div class="col-12 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Misión</h5>
            <textarea class="form-control w-100" rows="6" [(ngModel)]="mission" style="min-height:120px; width:100% !important; display:block; box-sizing:border-box;"></textarea>
            <div class="mt-2">
              <button class="btn btn-success btn-compact me-2" (click)="saveMission()">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>Guardar</span>
              </button>
              <button class="btn btn-outline-secondary btn-compact" (click)="reloadMission()">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <line x1="18" y1="6" x2="6" y2="18" stroke-linecap="round" stroke-linejoin="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Visión</h5>
            <textarea class="form-control w-100" rows="6" [(ngModel)]="vision" style="min-height:120px; width:100% !important; display:block; box-sizing:border-box;"></textarea>
            <div class="mt-2">
              <button class="btn btn-success btn-compact me-2" (click)="saveVision()">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>Guardar</span>
              </button>
              <button class="btn btn-outline-secondary btn-compact" (click)="reloadVision()">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <line x1="18" y1="6" x2="6" y2="18" stroke-linecap="round" stroke-linejoin="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class MissionVisionComponent {
  mission = '';
  vision = '';
  constructor(private http: HttpClient, private toast: ToastService) {
    this.reloadAll();
  }

  reloadAll() {
    this.reloadMission();
    this.reloadVision();
  }

  reloadMission() {
    this.http.get<any>('/api/settings/mission').subscribe({ next: r => this.mission = r && r.value ? r.value : '', error: e => console.error(e) });
  }

  reloadVision() {
    this.http.get<any>('/api/settings/vision').subscribe({ next: r => this.vision = r && r.value ? r.value : '', error: e => console.error(e) });
  }

  saveMission() {
    this.http.put('/api/settings/mission', { value: this.mission }).subscribe({ next: () => this.toast.show('Misión guardada', 'success'), error: e => { console.error(e); this.toast.show('Error al guardar misión', 'error'); } });
  }

  saveVision() {
    this.http.put('/api/settings/vision', { value: this.vision }).subscribe({ next: () => this.toast.show('Visión guardada', 'success'), error: e => { console.error(e); this.toast.show('Error al guardar visión', 'error'); } });
  }
}
