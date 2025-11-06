import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PrescriptionService, Receta } from '../../services/prescription.service';

@Component({
  selector: 'app-patient-prescriptions-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-prescriptions-history.component.html',
  styleUrls: ['./patient-prescriptions-history.component.css']
})
export class PatientPrescriptionsHistoryComponent implements OnInit {
  myDpi = '';
  recetas: Receta[] = [];
  loading = false;
  message = '';

  constructor(private auth: AuthService, private rxSvc: PrescriptionService) {}

  ngOnInit(): void {
    const u: any = this.auth.currentUserValue;
    this.myDpi = (u && (u.dpi || (u.usuario && u.usuario.dpi))) || '';
    if (!this.myDpi) {
      this.message = 'No se encontró DPI en tu perfil. No podemos listar tu historial.';
      return;
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.rxSvc.list({ paciente_dpi: this.myDpi, page: 1, limit: 100 }).subscribe({
      next: res => { this.recetas = res?.data || []; this.loading = false; },
      error: _ => { this.recetas = []; this.loading = false; }
    });
  }
}
