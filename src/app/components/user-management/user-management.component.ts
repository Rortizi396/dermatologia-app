// ...existing code...
// components/user-management/user-management.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, UserCreatePanelComponent, CommonModule]
})
export class UserManagementComponent implements OnInit {
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
  totalPages: number = 1;
  paginatedUsers: User[] = [];
  activeTab: 'activos' | 'inactivos' = 'activos';
  inactivos: User[] = [];
  paginatedInactivos: User[] = [];

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
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

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
    this.currentPage = 1;
    if (tab === 'activos') {
      this.filteredUsers = this.users;
      this.updatePagination();
    } else {
      this.updatePaginationInactivos();
    }
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAllUsers().subscribe({
      next: (response) => {
        const raw = Array.isArray(response) ? response : (response.data || response || []);
        const mapped = (raw || []).map((u: any) => {
          if (!u.tipo && u.Tipo) u.tipo = u.Tipo.toLowerCase();
          if (!u.tipo && u.tipo) u.tipo = u.tipo.toLowerCase();
          if (!u.tipo && u.TIPO) u.tipo = u.TIPO.toLowerCase();
          if (!u.tipo && u.tiPo) u.tipo = u.tiPo.toLowerCase();
          return u;
        });
        console.log('[loadUsers] total raw:', mapped.length);
        // Usuarios activos
        this.users = mapped.filter((u: any) => {
          if (u.Estado) return u.Estado.toUpperCase() === 'SI';
          if (typeof u.activo === 'boolean') return u.activo;
          if (typeof u.activo === 'string') return u.activo.toUpperCase() === 'SI';
          if (typeof u.activo === 'number') return u.activo === 1;
          return false;
        });
        // Usuarios inactivos
        this.inactivos = mapped.filter((u: any) => {
          if (u.Estado) return u.Estado.toUpperCase() === 'NO';
          if (typeof u.activo === 'boolean') return !u.activo;
          if (typeof u.activo === 'string') return u.activo.toUpperCase() === 'NO';
          if (typeof u.activo === 'number') return u.activo === 0;
          return false;
        });
        this.filteredUsers = this.users;
        this.totalItems = this.users.length;
        this.updatePagination();
        this.updatePaginationInactivos();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }
  updatePaginationInactivos(): void {
    this.totalPages = Math.ceil(this.inactivos.length / this.itemsPerPage) || 1;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedInactivos = this.inactivos.slice(start, end);
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
          this.currentPage = 1;
          this.updatePagination();
        } else {
          this.inactivos = this.inactivos || [];
          this.totalItems = this.inactivos.length;
          this.currentPage = 1;
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
        this.currentPage = 1;
        this.updatePagination();
      } else {
        this.inactivos = this.inactivos || [];
        const filteredInact = this.inactivos.filter(matches);
        this.totalItems = filteredInact.length;
        this.currentPage = 1;
        // show filtered inactivos in paginatedInactivos
        this.paginatedInactivos = filteredInact.slice(0, this.itemsPerPage);
        this.totalPages = Math.ceil(filteredInact.length / this.itemsPerPage) || 1;
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
        const mapped = (response.data || []).map((u: any) => {
          if (!u.tipo && u.Tipo) u.tipo = u.Tipo.toLowerCase();
          if (!u.tipo && u.tipo) u.tipo = u.tipo.toLowerCase();
          if (!u.tipo && u.TIPO) u.tipo = u.TIPO.toLowerCase();
          if (!u.tipo && u.tiPo) u.tipo = u.tiPo.toLowerCase();
          return u;
        });
        const filtered = mapped.filter((u: any) => {
          if (u.Estado) return u.Estado.toUpperCase() === 'SI';
          if (typeof u.activo === 'boolean') return u.activo;
          if (typeof u.activo === 'string') return u.activo.toUpperCase() === 'SI';
          if (typeof u.activo === 'number') return u.activo === 1;
          return false;
        });
        console.log('[Usuarios filtrados]', filtered.map((u: any) => ({ id: u.id, Estado: u.Estado, activo: u.activo, tipo: u.tipo })));
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
    this.currentPage = page;
    if (this.activeTab === 'activos') {
      this.updatePagination();
    } else {
      this.updatePaginationInactivos();
    }
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage) || 1;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }
}