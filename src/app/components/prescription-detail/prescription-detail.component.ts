import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PrescriptionService, Receta } from '../../services/prescription.service';
import { PatientService, Patient } from '../../services/patient.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-prescription-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './prescription-detail.component.html',
  styleUrls: ['./prescription-detail.component.css']
})
export class PrescriptionDetailComponent implements OnInit {
  id!: number;
  receta: Receta | null = null;
  loading = false;
  error = '';

  logoPath = 'assets/favicon.svg';
  clinicPhone = '4265-8975';
  clinicAddress = '4ta calle 13-47 zona 3, segundo nivel';

  paciente: Patient | null = null;
  backUrl = '/doctor/recetas';

  constructor(
    private route: ActivatedRoute,
    private rxSvc: PrescriptionService,
    private patientsSvc: PatientService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const u: any = this.auth.currentUserValue;
    const role = (u?.tipo || u?.Tipo || '').toString().toLowerCase();
    this.backUrl = role === 'paciente' ? '/paciente/recetas' : '/doctor/recetas';

    this.loading = true;
    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = idParam ? parseInt(idParam, 10) : NaN;
    if (!this.id || isNaN(this.id)) {
      this.error = 'ID inválido';
      this.loading = false;
      return;
    }
    this.rxSvc.getById(this.id).subscribe({
      next: res => {
        this.receta = res?.data || null;
        this.loading = false;
        if (this.receta?.paciente_dpi) {
          this.patientsSvc.list(false).subscribe(list => {
            const dpi = String(this.receta!.paciente_dpi);
            this.paciente = (list || []).find(p => String(p.DPI) === dpi) || null;
          });
        }
      },
      error: _ => {
        this.error = 'No se pudo cargar la receta';
        this.loading = false;
      }
    });
  }

  displayPatient(): string {
    if (!this.receta) return '';
    if (this.paciente) {
      const nombre = `${this.paciente.Nombres || (this.paciente as any).nombres || ''} ${this.paciente.Apellidos || (this.paciente as any).apellidos || ''}`.trim();
      return `${nombre} — DPI: ${this.receta.paciente_dpi}`;
    }
    return `DPI: ${this.receta.paciente_dpi}`;
  }

  async reprintPdf(): Promise<void> {
    try {
      const el = document.getElementById('rx-sheet');
      if (!el) { this.toast.show('No se encontró la plantilla de la receta', 'error'); return; }
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'pt', 'letter');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      doc.addImage(imgData, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
      const fecha = this.receta?.fecha || new Date().toISOString().slice(0,10);
      doc.save(`receta_${fecha}.pdf`);
      this.toast.show('PDF generado correctamente');
    } catch (e) {
      console.error('[PDF][reprint] error', e);
      this.toast.show('No se pudo generar el PDF', 'error');
    }
  }
}
