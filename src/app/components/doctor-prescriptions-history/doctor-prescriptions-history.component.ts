import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PatientService, Patient } from '../../services/patient.service';
import { PrescriptionService, Receta } from '../../services/prescription.service';

@Component({
  selector: 'app-doctor-prescriptions-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './doctor-prescriptions-history.component.html',
  styleUrls: ['./doctor-prescriptions-history.component.css']
})
export class DoctorPrescriptionsHistoryComponent implements OnInit {
  meCorreo = '';
  meColegiado = '';
  pacientes: Patient[] = [];
  selectedDPI = '';
  misRecetas: Receta[] = [];
  recetasPorPaciente: Receta[] = [];
  loadingSelf = false;
  loadingPaciente = false;

  constructor(
    private auth: AuthService,
    private patientSvc: PatientService,
    private rxSvc: PrescriptionService
  ){}

  ngOnInit(): void {
    const u: any = this.auth.currentUserValue;
    this.meCorreo = u?.correo || '';
    this.meColegiado = u?.colegiado || '';

    this.patientSvc.list(false).subscribe(list => this.pacientes = list || []);
    this.loadMine();
  }

  loadMine(): void {
    this.loadingSelf = true;
    this.rxSvc.list({ doctor_correo: this.meCorreo || undefined, doctor_colegiado: this.meColegiado || undefined, page: 1, limit: 100 }).subscribe({
      next: res => { this.misRecetas = res?.data || []; this.loadingSelf = false; },
      error: _ => { this.misRecetas = []; this.loadingSelf = false; }
    });
  }

  searchByPaciente(): void {
    if (!this.selectedDPI) { this.recetasPorPaciente = []; return; }
    this.loadingPaciente = true;
    this.rxSvc.list({ paciente_dpi: this.selectedDPI, page: 1, limit: 100 }).subscribe({
      next: res => { this.recetasPorPaciente = res?.data || []; this.loadingPaciente = false; },
      error: _ => { this.recetasPorPaciente = []; this.loadingPaciente = false; }
    });
  }

  displayPatient(dpi: string): string {
    const p = this.pacientes.find(x => String(x.DPI) === String(dpi));
    return p ? `${p.Nombres || p.nombres || ''} ${p.Apellidos || p.apellidos || ''}`.trim() : dpi;
  }
}
