import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MedicationService } from '../../services/medication.service';
import { PatientService, Patient } from '../../services/patient.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { HttpClient } from '@angular/common/http';

interface PrescriptionItem {
  cantidad: number | null;
  nombre: string;
  dosis: string;
}

@Component({
  selector: 'app-doctor-prescription',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './doctor-prescription.component.html',
  styleUrls: ['./doctor-prescription.component.css']
})
export class DoctorPrescriptionComponent implements OnInit {
  form!: FormGroup;
  today = new Date();
  doctorName = '';
  doctorEmail = '';
  doctorColegiado = '';
  maxItems = 15;
  isGenerating = false;
  logoPath = 'assets/favicon.svg';
  clinicPhone = '4265-8975';
  clinicAddress = '4ta calle 13-47 zona 3, segundo nivel';

  // Simple suggestions cache per input index
  suggestions: Record<number, string[]> = {};

  patients: Patient[] = [];
  selectedPatient: Patient | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private toast: ToastService,
    private meds: MedicationService,
    private patientsSvc: PatientService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUserValue as any;
    if (!user || String(user.tipo).toLowerCase() !== 'doctor') {
      this.toast.show('Solo los doctores pueden generar recetas', 'error');
    }
    this.doctorName = `${user?.nombres || ''} ${user?.apellidos || ''}`.trim();
    this.doctorEmail = user?.correo || '';
    this.doctorColegiado = (user as any)?.colegiado || '';

    this.form = this.fb.group({
      fecha: [this.formatDate(this.today), [Validators.required]],
      doctor: [{ value: this.doctorName, disabled: true }],
      pacienteDPI: ['', [Validators.required]],
      items: this.fb.array([this.createItem()]),
      observaciones: ['']
    });

  // Cargar pacientes para el selector (ya normalizados por el servicio)
  this.patientsSvc.list(false).subscribe(list => { this.patients = list || []; });
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  createItem(): FormGroup {
    return this.fb.group({
      cantidad: [null, [Validators.min(0.01), Validators.required]],
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      dosis: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  addItem(): void {
    if (this.items.length >= this.maxItems) return;
    this.items.push(this.createItem());
  }

  removeItem(i: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(i);
  }

  onNameInput(i: number): void {
    const group = this.items.at(i) as FormGroup;
    const value = (group.get('nombre')?.value || '').toString().trim();
    if (!value) { this.suggestions[i] = []; return; }
    this.meds.search(value).subscribe({
      next: (res: any) => { this.suggestions[i] = (res?.data || res || []).map((r: any) => r.nombre || r.Nombre || r); },
      error: (_: any) => { this.suggestions[i] = []; }
    });
  }

  applySuggestion(i: number, text: string): void {
    const group = this.items.at(i) as FormGroup;
    group.get('nombre')?.setValue(text);
    this.suggestions[i] = [];
  }

  canGenerate(): boolean {
    return this.form.valid && this.items.length > 0 && !this.isGenerating;
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  async generatePdf(): Promise<void> {
    if (!this.canGenerate()) { this.toast.show('Completa los campos requeridos', 'error'); return; }
    this.isGenerating = true;

    // Best-effort: persist new medication names used
    try {
      const unique = new Set<string>();
      (this.items.value as PrescriptionItem[]).forEach(it => {
        const n = (it.nombre || '').toString().trim();
        if (n) unique.add(n);
      });
      for (const name of unique) {
        try { await this.meds.add(name).toPromise(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    try {
      // Guardar receta en backend antes de generar el PDF
      const payload = this.buildPayload();
      try { await this.http.post(((window as any).__env?.apiUrl || '/api') + '/recetas', payload).toPromise(); }
      catch (e) { console.warn('[RECETAS] error al guardar', e); this.toast.show('No se pudo guardar la receta en el servidor', 'error'); }

      // Render the prescription area to canvas using html2canvas and then add to jsPDF
  const el = document.getElementById('rx-sheet');
      if (!el) { this.toast.show('No se encontró la plantilla de la receta', 'error'); this.isGenerating = false; return; }
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF('p', 'pt', 'letter');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      // Fit image keeping aspect ratio
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      doc.addImage(imgData, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
      doc.save(`receta_${this.formatDate(new Date())}.pdf`);
      this.toast.show('PDF generado correctamente');
    } catch (e) {
      console.error('[PDF] error', e);
      this.toast.show('No se pudo generar el PDF', 'error');
    } finally {
      this.isGenerating = false;
    }
  }

  private buildPayload() {
    const items = (this.items.value as PrescriptionItem[]).map(it => ({ cantidad: Number(it.cantidad), nombre: (it.nombre||'').trim(), dosis: (it.dosis||'').trim() }));
    const pacienteDPI = this.form.get('pacienteDPI')?.value;
    return {
      fecha: this.form.get('fecha')?.value,
      doctor: { nombre: this.doctorName, correo: this.doctorEmail, colegiado: this.doctorColegiado },
      paciente_dpi: pacienteDPI,
      observaciones: this.form.get('observaciones')?.value || '',
      items
    };
  }

  getSelectedPatient(): Patient | null {
    try {
      const dpi = this.form.get('pacienteDPI')?.value;
      const found = this.patients.find(p => String(p.DPI) === String(dpi));
      return found || null;
    } catch { return null; }
  }

  getSelectedPatientName(): string {
    const p = this.getSelectedPatient();
    const name = `${p?.Nombres || p?.nombres || ''} ${p?.Apellidos || p?.apellidos || ''}`.trim();
    return name || '—';
  }

  getSelectedPatientDPI(): string {
    const p = this.getSelectedPatient();
    return (p?.DPI ? String(p.DPI) : '—');
  }
}
