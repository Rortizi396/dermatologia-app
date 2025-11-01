// ...existing code...
// components/user-management/user-management.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { UserCreatePanelComponent } from './user-create-panel.component';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user.interface';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, UserCreatePanelComponent, NgIf, NgFor]
})
export class UserManagementComponent implements OnInit {
  // Cache para evitar spamear el endpoint si no existe en backend desplegado
  private byEmailEndpointAvailable: boolean | null = null;
  // Helper to normalize "tipo" and common fields
  private normalizeUser(u: any): any {
    if (!u) return u;
    // Normalize tipo
    const t = (u.tipo || u.Tipo || u.TIPO || u.tiPo || '').toString();
    if (t) u.tipo = t.toLowerCase();
    // Normalize correo/email
    u.correo = u.correo || u.Correo || u.email || u.Email || '';
    // Normalize nombres/apellidos
    u.nombres = u.nombres || u.Nombres || '';
    u.apellidos = u.apellidos || u.Apellidos || '';
    // Normalize active flag: if none present, set as true so it's visible in Activos
    const hasEstado = typeof u.Estado !== 'undefined' || typeof u.estado !== 'undefined';
    const hasActivo = typeof u.Activo !== 'undefined' || typeof u.activo !== 'undefined' || typeof u.isActive !== 'undefined' || typeof u.status !== 'undefined';
    if (!hasEstado && !hasActivo) {
      u.activo = true;
    }
    return u;
  }

  // Helper to evaluate active flag with many variants; default to true if unknown
  public isActive(u: any): boolean {
    try {
      if (!u) return false;
      // Prefer explicit boolean
      if (typeof u.activo === 'boolean') return u.activo === true;
      // Common variants as string
      const est = (u.Estado ?? u.estado ?? '').toString().trim();
      if (est) return est.toUpperCase() === 'SI' || est === '1' || est.toLowerCase() === 'active';
      const act = (u.Activo ?? u.activo ?? u.isActive ?? u.status ?? '').toString().trim();
      if (act) return act.toUpperCase() === 'SI' || act === '1' || act.toLowerCase() === 'active' || act.toLowerCase() === 'true';
      // If no flags present, consider active so lists are not empty and user can be managed
      return true;
    } catch {
      return true;
    }
  }

  public isInactive(u: any): boolean {
    try {
      if (!u) return false;
      if (typeof u.activo === 'boolean') return u.activo === false;
      const est = (u.Estado ?? u.estado ?? '').toString().trim();
      if (est) return est.toUpperCase() === 'NO' || est === '0' || est.toLowerCase() === 'inactive';
      const act = (u.Activo ?? u.activo ?? u.isActive ?? u.status ?? '').toString().trim();
      if (act) return act.toUpperCase() === 'NO' || act === '0' || act.toLowerCase() === 'inactive' || act.toLowerCase() === 'false';
      // If unknown, not explicitly inactive
      return false;
    } catch {
      return false;
    }
  }

  // Build a friendly display name; fallback to correo if names missing
  public getUserDisplayName(u: any): string {
    if (!u) return '';
    const nombres = (u.nombres || u.Nombres || '').toString().trim();
    const apellidos = (u.apellidos || u.Apellidos || '').toString().trim();
    const full = `${nombres} ${apellidos}`.trim();
    if (full) return full;
    // Fallback elegante: derivar nombre desde el correo ("carlos.lopez" -> "Carlos Lopez")
    const correo = (u.correo || u.Correo || '').toString().trim();
    if (correo) {
      const derived = this.deriveNameFromEmail(correo);
      const fallbackFull = `${derived.nombres} ${derived.apellidos}`.trim();
      if (fallbackFull) return fallbackFull;
    }
    return 'Sin nombre';
  }

  private deriveNameFromEmail(email: string): { nombres: string; apellidos: string } {
    try {
      const local = (email.split('@')[0] || '').replace(/\d+/g, '');
      if (!local) return { nombres: '', apellidos: '' };
      const parts = local.split(/[._-]+/).filter(Boolean);
      const cap = (s: string) => s ? (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()) : '';
      if (parts.length === 1) return { nombres: cap(parts[0]), apellidos: '' };
      if (parts.length >= 2) return { nombres: cap(parts[0]), apellidos: cap(parts[1]) };
      return { nombres: '', apellidos: '' };
    } catch {
      return { nombres: '', apellidos: '' };
    }
  }
  darDeAlta(user: User): void {
    let id = user.id || user.dpi || user.colegiado || user.idSecretaria || user.idAdministrador;
    if (typeof id === 'number') {
      this.userService.activateUsuario(id).subscribe({
        next: () => {
          setTimeout(() => {
            this.loadUsers();
          }, 300);
          alert('Usuario dado de alta correctamente.');
        },
        error: (err) => {
          alert('Error al dar de alta usuario.');
          console.error('Error al dar de alta:', err);
        }
      });
    } else {
      alert('No se pudo determinar el ID del usuario para dar de alta.');
      console.error('ID de usuario indefinido:', user);
    }
  }
  editingUser: any = null;
  // Paginación y ordenamiento (activos)
  totalPagesActivos: number = 1;
  currentPageActivos: number = 1;
  paginatedUsers: User[] = [];
  sortFieldActivos: 'nombre' | 'correo' | 'tipo' = 'nombre';
  sortDirActivos: 'asc' | 'desc' = 'asc';
  activeTab: 'activos' | 'inactivos' = 'activos';
  // Paginación y ordenamiento (inactivos)
  inactivos: User[] = [];
  filteredInactivos: User[] = [];
  paginatedInactivos: User[] = [];
  totalPagesInactivos: number = 1;
  currentPageInactivos: number = 1;
  sortFieldInactivos: 'nombre' | 'correo' | 'tipo' = 'nombre';
  sortDirInactivos: 'asc' | 'desc' = 'asc';

  editUser(user: User): void {
    this.editingUser = { ...user };
  }

  saveUserEdits(): void {
    if (!this.editingUser) return;
    // Detectar tipo para endpoint correcto y usar el identificador que espera el backend
    let tipoRaw = this.editingUser.tipo || this.editingUser.Tipo || '';
    let tipo = tipoRaw.toString().toLowerCase();
    let id: any = null;
    switch (tipo) {
      case 'paciente':
      case 'pacientes':
        // Backend espera DPI para pacientes
        id = this.editingUser.dpi || this.editingUser.DPI || this.editingUser.DPI || this.editingUser.id || null;
        break;
      case 'doctor':
      case 'doctores':
        // Backend espera Colegiado para doctores
        id = this.editingUser.colegiado || this.editingUser.Colegiado || this.editingUser.id || null;
        break;
      case 'secretaria':
      case 'secretarias':
        id = this.editingUser.idSecretaria || this.editingUser.id || null;
        break;
      case 'administrador':
      case 'administradores':
        id = this.editingUser.idAdministrador || this.editingUser.id || null;
        break;
      default:
        id = this.editingUser.id || this.editingUser.dpi || this.editingUser.colegiado || null;
    }

    if (id === null || typeof id === 'undefined' || id === '') {
      console.error('No se pudo determinar el identificador correcto para actualizar el usuario:', { tipo, editingUser: this.editingUser });
      alert('No se pudo determinar el identificador del usuario. Revisa los datos y vuelve a intentarlo.');
      return;
    }

    this.userService.updateUserByType(tipo, id, this.editingUser).subscribe({
      next: () => {
        this.editingUser = null;
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error actualizando usuario:', err);
        alert('Error actualizando usuario: ' + (err?.error?.message || err?.message || 'Error desconocido'));
      }
    });
  }

  cancelEdit(): void {
    this.editingUser = null;
  }

  darDeBaja(user: User): void {
    let tipo = user.tipo || (user as any)['Tipo'];
    let id = user.id || user.dpi || user.colegiado || user.idSecretaria || user.idAdministrador;
    if (!tipo || typeof tipo !== 'string') {
      console.error('No se puede dar de baja: tipo de usuario indefinido', user);
      return;
    }
    if (typeof id === 'number') {
      this.userService.inactivateUsuario(id).subscribe({
        next: () => {
          setTimeout(() => {
            this.loadUsers();
          }, 300);
          alert('Usuario dado de baja correctamente en Usuarios');
        },
        error: (err) => {
          alert('Error al dar de baja usuario en Usuarios');
          console.error('Error al dar de baja en Usuarios:', err);
        }
      });
    } else {
      alert('No se pudo determinar el ID del usuario para dar de baja.');
      console.error('ID de usuario indefinido:', user);
    }
  }
  selectedUser: any = null;
  selectedType: string = '';
  detailsLoading = false;
  users: User[] = [];
  filteredUsers: User[] = [];

  loading = true;
  searchTerm = '';
  private searchDebounceTimer: any = null;
  // Preferencias de paginación
  itemsPerPageOptions = [5, 10, 20, 50];
  itemsPerPage = 10;
  totalItems = 0;

  // Getters para la vista actual
  get currentPageView(): number { return this.activeTab === 'activos' ? this.currentPageActivos : this.currentPageInactivos; }
  get totalPagesView(): number { return this.activeTab === 'activos' ? this.totalPagesActivos : this.totalPagesInactivos; }

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    // Subscribe to user changes to auto-refresh
    this.userService.userChanges$.subscribe(() => {
      // small debounce to allow backend to complete writes
      setTimeout(() => this.loadUsers(), 200);
    });
  }

  // Cambia la pestaña activa de forma controlada (evita la navegación por defecto)
  setActiveTab(tab: 'activos' | 'inactivos', event?: Event) {
    if (event) event.preventDefault();
    this.activeTab = tab;
    if (tab === 'activos') {
      this.filteredUsers = this.users;
      this.currentPageActivos = 1;
      this.updatePagination();
    } else {
      this.currentPageInactivos = 1;
      this.updatePaginationInactivos();
    }
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAllUsers().subscribe({
      next: (response) => {
        const raw = Array.isArray(response) ? response : (response.data || response || []);
        const mapped = (raw || []).map((u: any) => this.normalizeUser(u));
        console.log('[loadUsers] total raw:', mapped.length);
        // Usuarios activos/inactivos con normalización robusta
  this.users = mapped.filter((u: any) => this.isActive(u));
  this.inactivos = mapped.filter((u: any) => this.isInactive(u));
  this.filteredUsers = this.users;
  this.filteredInactivos = this.inactivos;
  this.totalItems = this.users.length;
  this.currentPageActivos = 1;
  this.currentPageInactivos = 1;
  this.updatePagination();
  this.updatePaginationInactivos();
        // Enriquecer nombres faltantes con una consulta adicional por correo
        this.enrichMissingNames([...this.users, ...this.inactivos]).finally(() => {
          this.updatePagination();
          this.updatePaginationInactivos();
          this.loading = false;
        });
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  private async enrichMissingNames(all: any[]): Promise<void> {
    try {
      const targets = all.filter(u => !((u.nombres && u.nombres.trim()) || (u.Nombres && String(u.Nombres).trim())));
      if (targets.length === 0) return;

      // 1) Intentar completar desde listados por tipo (endpoints existentes en backend)
      try {
        const [pacRes, docRes, secRes] = await Promise.all([
          this.userService.getAllPacientes().toPromise(),
          this.userService.getAllDoctores().toPromise(),
          this.userService.getAllSecretarias().toPromise()
        ]);
        const mapByEmail = new Map<string, { nombres: string; apellidos: string }>();
        const addAll = (arr: any[], correoKey = 'Correo') => {
          (arr || []).forEach((r: any) => {
            const correo = (r[correoKey] || r.correo || '').toString();
            if (!correo) return;
            const nombres = (r.Nombres || r.nombres || '').toString();
            const apellidos = (r.Apellidos || r.apellidos || '').toString();
            if (nombres || apellidos) mapByEmail.set(correo, { nombres, apellidos });
          });
        };
        addAll((pacRes && pacRes.data) || []);
        addAll((docRes && docRes.data) || []);
        addAll((secRes && secRes.data) || []);

        targets.forEach(u => {
          const correo = (u.correo || u.Correo || '').toString();
          if (!correo) return;
          const found = mapByEmail.get(correo);
          if (found) {
            u.nombres = found.nombres || u.nombres || u.Nombres || '';
            u.apellidos = found.apellidos || u.apellidos || u.Apellidos || '';
          }
        });
      } catch { /* ignorar si algún endpoint falla */ }

      // 2) Si aún faltan, probar endpoint by-email una sola vez; si 404, no insistir
      const stillMissing = all.filter(u => !((u.nombres && u.nombres.trim()) || (u.Nombres && String(u.Nombres).trim())));
      if (stillMissing.length === 0) return;
      if (this.byEmailEndpointAvailable === false) return;

      if (this.byEmailEndpointAvailable === null) {
        const probe = stillMissing[0];
        const correoProbe = (probe.correo || probe.Correo || '').toString();
        if (correoProbe) {
          try {
            const r = await this.userService.getUsuarioByCorreo(correoProbe).toPromise();
            if (r && r.success) {
              this.byEmailEndpointAvailable = true;
              if (r.data) {
                probe.nombres = r.data.nombres || probe.nombres || probe.Nombres || '';
                probe.apellidos = r.data.apellidos || probe.apellidos || probe.Apellidos || '';
              }
            } else {
              this.byEmailEndpointAvailable = false;
            }
          } catch (e: any) {
            if (e && e.status === 404) this.byEmailEndpointAvailable = false; else this.byEmailEndpointAvailable = false;
          }
        } else {
          this.byEmailEndpointAvailable = false;
        }
      }

      if (this.byEmailEndpointAvailable === true) {
        for (let i = 1; i < stillMissing.length; i++) {
          const u = stillMissing[i];
          const correo = (u.correo || u.Correo || '').toString();
          if (!correo) continue;
          try {
            const resp = await this.userService.getUsuarioByCorreo(correo).toPromise();
            if (resp && resp.success && resp.data) {
              u.nombres = resp.data.nombres || u.nombres || u.Nombres || '';
              u.apellidos = resp.data.apellidos || u.apellidos || u.Apellidos || '';
            }
          } catch (e: any) {
            if (e && e.status === 404) { this.byEmailEndpointAvailable = false; break; }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  updatePaginationInactivos(): void {
    const sorted = this.sortUsers(this.filteredInactivos, this.sortFieldInactivos, this.sortDirInactivos);
    this.totalPagesInactivos = Math.ceil(sorted.length / this.itemsPerPage) || 1;
    const start = (this.currentPageInactivos - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedInactivos = sorted.slice(start, end);
  }

  searchUsers(): void {
    // debounce to avoid filtering on every keystroke
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      const q = (this.searchTerm || '').toString().trim().toLowerCase();
      if (!q) {
        // reset
        if (this.activeTab === 'activos') {
          this.filteredUsers = this.users;
          this.totalItems = this.filteredUsers.length;
          this.currentPageActivos = 1;
          this.updatePagination();
        } else {
          this.filteredInactivos = this.inactivos || [];
          this.totalItems = this.filteredInactivos.length;
          this.currentPageInactivos = 1;
          this.updatePaginationInactivos();
        }
        return;
      }

      const matches = (user: any) => {
        try {
          const name = ((user.nombres || '') + ' ' + (user.apellidos || '')).toLowerCase();
          return name.includes(q) || (user.correo || '').toLowerCase().includes(q) || (user.tipo || '').toLowerCase().includes(q);
        } catch (ex) {
          return false;
        }
      };

      if (this.activeTab === 'activos') {
        this.filteredUsers = this.users.filter(matches);
        this.totalItems = this.filteredUsers.length;
        this.currentPageActivos = 1;
        this.updatePagination();
      } else {
        this.filteredInactivos = (this.inactivos || []).filter(matches);
        this.totalItems = this.filteredInactivos.length;
        this.currentPageInactivos = 1;
        this.updatePaginationInactivos();
      }
    }, 150);
  }

  showUserDetails(user: User): void {
    this.selectedUser = null;
    this.detailsLoading = true;
    this.selectedType = user.tipo;
    let id;
    switch (user.tipo) {
      case 'paciente':
        id = user.dpi;
        break;
      case 'doctor':
        id = user.colegiado;
        break;
      case 'secretaria':
        id = user.idSecretaria;
        break;
      case 'administrador':
        id = user.idAdministrador;
        break;
      default:
        id = user.id;
    }
    if (id === undefined || id === null) {
      this.selectedUser = null;
      this.detailsLoading = false;
      return;
    }
    this.userService.getUserDetails(id, user.tipo).subscribe({
      next: (response: any) => {
        console.log('[Usuarios recibidos]', response.data);
        const mapped = (response.data || []).map((u: any) => this.normalizeUser(u));
        const filtered = mapped.filter((u: any) => this.isActive(u));
        console.log('[Usuarios filtrados]', filtered.map((u: any) => ({ id: u.id, Estado: u.Estado, Activo: u.Activo, activo: u.activo, tipo: u.tipo })));
        this.users = filtered;
        this.filteredUsers = this.users;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading user details:', error);
        this.loading = false;
      }
    });
  }
  changePage(page: number): void {
    if (this.activeTab === 'activos') {
      this.currentPageActivos = Math.min(Math.max(1, page), this.totalPagesActivos);
      this.updatePagination();
    } else {
      this.currentPageInactivos = Math.min(Math.max(1, page), this.totalPagesInactivos);
      this.updatePaginationInactivos();
    }
  }

  updatePagination(): void {
    const sorted = this.sortUsers(this.filteredUsers, this.sortFieldActivos, this.sortDirActivos);
    this.totalPagesActivos = Math.ceil(sorted.length / this.itemsPerPage) || 1;
    const start = (this.currentPageActivos - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedUsers = sorted.slice(start, end);
  }

  changeSort(tab: 'activos' | 'inactivos', field: 'nombre' | 'correo' | 'tipo'): void {
    if (tab === 'activos') {
      if (this.sortFieldActivos === field) {
        this.sortDirActivos = this.sortDirActivos === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortFieldActivos = field;
        this.sortDirActivos = 'asc';
      }
      this.updatePagination();
    } else {
      if (this.sortFieldInactivos === field) {
        this.sortDirInactivos = this.sortDirInactivos === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortFieldInactivos = field;
        this.sortDirInactivos = 'asc';
      }
      this.updatePaginationInactivos();
    }
  }

  onChangePageSize(): void {
    // Reset pages and recalc when itemsPerPage changes
    this.currentPageActivos = 1;
    this.currentPageInactivos = 1;
    this.updatePagination();
    this.updatePaginationInactivos();
  }

  private sortUsers(list: any[], field: 'nombre' | 'correo' | 'tipo', dir: 'asc' | 'desc'): any[] {
    const arr = Array.isArray(list) ? [...list] : [];
    const collator = new Intl.Collator('es', { sensitivity: 'base' });
    const factor = dir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      let av = '';
      let bv = '';
      if (field === 'nombre') { av = this.getUserDisplayName(a); bv = this.getUserDisplayName(b); }
      else if (field === 'correo') { av = (a.correo || '').toString(); bv = (b.correo || '').toString(); }
      else if (field === 'tipo') { av = (a.tipo || '').toString(); bv = (b.tipo || '').toString(); }
      const cmp = collator.compare(av, bv);
      return cmp * factor;
    });
  }
}