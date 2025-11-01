import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-secretary-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-patients.component.html',
  styleUrls: ['./secretary-patients.component.css']
})
export class SecretaryPatientsComponent implements OnInit {
  patients: any[] = [];
  filtered: any[] = [];
  loading = false;
  // Paginación
  page = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];
  totalPages = 1;
  // Búsqueda
  search = '';
  // Edición
  editingDpi: string | null = null;
  editTelefono = '';
  editCorreo = '';

  constructor(private userService: UserService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    // Trae todos (incluye inactivos) para administración completa
    this.userService.getPacientes(true).subscribe({
      next: (resp: any) => {
        const arr = Array.isArray(resp) ? resp : (resp.data || resp || []);
        this.patients = arr;
        this.applyFilters();
        this.loading = false;
      },
      error: (e: any) => { console.error('Error cargando pacientes', e); this.loading = false; }
    });
  }

  applyFilters(): void {
    const q = (this.search || '').toLowerCase().trim();
    let list = [...this.patients];
    if (q) {
      list = list.filter(p => {
        const nombre = `${p.Nombres || ''} ${p.Apellidos || ''}`.toLowerCase();
        const correo = (p.Correo || '').toLowerCase();
        const dpi = String(p.DPI || '');
        const tel = String(p.Telefono || '');
        return nombre.includes(q) || correo.includes(q) || dpi.includes(q) || tel.includes(q);
      });
    }
    this.filtered = list;
    this.page = 1;
    this.recalcPages();
  }

  recalcPages(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  changePageSize(): void { this.page = 1; this.recalcPages(); }

  startEdit(p: any): void {
    this.editingDpi = String(p.DPI);
    this.editTelefono = p.Telefono || '';
    this.editCorreo = p.Correo || '';
  }

  cancelEdit(): void {
    this.editingDpi = null;
    this.editTelefono = '';
    this.editCorreo = '';
  }

  saveEdit(): void {
    if (!this.editingDpi) return;
    const dpi = this.editingDpi;
    const payload: any = { Telefono: this.editTelefono, Correo: this.editCorreo };
    // Actualiza en tabla Pacientes y sincroniza con Usuarios por correo anterior (backend ya lo maneja)
    this.userService.updateUserByType('pacientes', dpi, payload).subscribe({
      next: () => { this.cancelEdit(); this.loadPatients(); },
      error: (e: any) => { console.error('Error guardando paciente', e); }
    });
  }

  // Helpers para plantillas
  toStringVal(v: any): string { try { return String(v ?? ''); } catch { return '';} }
  min(a: number, b: number): number { return Math.min(a, b); }
}
