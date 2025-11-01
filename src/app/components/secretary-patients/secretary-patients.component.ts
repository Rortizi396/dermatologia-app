import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

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
  // Ordenamiento
  sortBy: 'apellidos' | 'nombres' | 'dpi' | 'correo' = 'apellidos';
  sortDir: 'asc' | 'desc' = 'asc';
  // Filtro de estado
  statusFilter: 'todos' | 'activos' | 'inactivos' = 'todos';
  // Edición
  editingDpi: string | null = null;
  editTelefono = '';
  editCorreo = '';

  constructor(private userService: UserService, private http: HttpClient, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    // Trae todos (incluye inactivos) para administración completa
    this.userService.getPacientes(true).subscribe({
      next: (resp: any) => {
        const arr = Array.isArray(resp) ? resp : (resp.data || resp || []);
        // Normalizar llaves para UI consistente
        this.patients = (arr || []).map((p: any) => this.normalizePatient(p));
        this.applyFilters();
        this.loading = false;
      },
      error: (e: any) => { console.error('Error cargando pacientes', e); this.loading = false; this.toast.show('Error cargando pacientes', 'error'); }
    });
  }

  applyFilters(): void {
    const q = (this.search || '').toLowerCase().trim();
    let list = [...this.patients];
    // Filtro estado
    if (this.statusFilter !== 'todos') {
      const wantActive = this.statusFilter === 'activos';
      list = list.filter(p => (p.Activo || 'NO') === (wantActive ? 'SI' : 'NO'));
    }
    if (q) {
      list = list.filter(p => {
        const nombre = `${p.Nombres || ''} ${p.Apellidos || ''}`.toLowerCase();
        const correo = (p.Correo || '').toLowerCase();
        const dpi = String(p.DPI || '');
        const tel = String(p.Telefono || '');
        return nombre.includes(q) || correo.includes(q) || dpi.includes(q) || tel.includes(q);
      });
    }
    // Ordenar
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const getKey = (p: any) => {
      switch (this.sortBy) {
        case 'nombres': return `${p.Nombres || ''}`.toLowerCase();
        case 'dpi': return String(p.DPI || '');
        case 'correo': return `${p.Correo || ''}`.toLowerCase();
        case 'apellidos':
        default: return `${p.Apellidos || ''}`.toLowerCase();
      }
    };
    list.sort((a, b) => (getKey(a) > getKey(b) ? 1 * dir : getKey(a) < getKey(b) ? -1 * dir : 0));

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
      next: () => { this.cancelEdit(); this.toast.show('Paciente actualizado'); this.loadPatients(); },
      error: (e: any) => { console.error('Error guardando paciente', e); this.toast.show('Error al guardar cambios', 'error'); }
    });
  }

  // Helpers para plantillas
  toStringVal(v: any): string { try { return String(v ?? ''); } catch { return '';} }
  min(a: number, b: number): number { return Math.min(a, b); }
  normalizePatient(p: any): any {
    const get = (a: any, b: any) => (typeof a !== 'undefined' && a !== null && a !== '') ? a : b;
    const up = (s: any) => (typeof s === 'string' ? s.toUpperCase() : s);
    const activoRaw = get(p.Activo, get(p.activo, 'SI'));
    const activo = ((): string => {
      const v = ('' + activoRaw).toUpperCase();
      return v === 'SI' || v === 'S' || v === 'TRUE' || v === '1' ? 'SI' : 'NO';
    })();
    return {
      ...p,
      DPI: get(p.DPI, get(p.dpi, get(p.id, ''))),
      Nombres: get(p.Nombres, p.nombres || ''),
      Apellidos: get(p.Apellidos, p.apellidos || ''),
      Telefono: get(p.Telefono, p.telefono || ''),
      Correo: get(p.Correo, p.correo || ''),
      Activo: activo
    };
  }
}
