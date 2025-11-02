// app.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { User } from './interfaces/user.interface';
import { filter } from 'rxjs/operators';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent{
  title = 'Centro Dermatológico';
  currentUser: User | null = null;
  showSidebar = false;
  isMobileSidebarOpen = false;
  currentRoute = '';
  // Evita múltiples intentos de enriquecer nombres si ya se hizo una vez
  private triedNameEnrichment = false;

  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router
    , private toastService: ToastService,
    private userService: UserService
  ) {}

  // Expose toast observable for global container
  get toast$() {
    return this.toastService.toast$;
  }

  ngOnInit(): void {
    // Suscribirse a cambios en el usuario autenticado
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.updateSidebarVisibility();

      // Intentar enriquecer nombres/apellidos si faltan y aún no lo intentamos
      if (user && !this.triedNameEnrichment) {
        const u: any = user as any;
        const hasFirst = !!(u.nombres || u.Nombres || u.name);
        const hasLast = !!(u.apellidos || u.Apellidos || u.lastname || u.lastName);
        const correo = u.correo as string | undefined;
        const token = this.authService.getToken();
        if ((!hasFirst || !hasLast) && correo && token) {
          this.triedNameEnrichment = true;
          this.userService.getUsuarioByCorreo(correo).subscribe({
            next: (resp) => {
              if (resp?.success && resp.data) {
                const updated: any = { ...u };
                if (!hasFirst && resp.data.nombres) updated.nombres = resp.data.nombres;
                if (!hasLast && resp.data.apellidos) updated.apellidos = resp.data.apellidos;
                // Persistir usuario enriquecido sin alterar el token actual
                this.authService.setCurrentUser(updated, token);
              }
            },
            error: () => {
              // Silencioso: si no existe endpoint o falla, mantener fallback
            }
          });
        }
      }
    });

    // Suscribirse a cambios de ruta para actualizar la navegación
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        this.updateSidebarVisibility();
      });
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  updateSidebarVisibility(): void {
    // No mostrar sidebar en login y en algunas rutas específicas
    this.showSidebar = this.currentUser !== null && 
                      !this.currentRoute.includes('/login') &&
                      this.currentRoute !== '/';
    // Al navegar, cerrar sidebar móvil si estaba abierto
    this.isMobileSidebarOpen = false;
  }

  get userRole(): string {
    return this.currentUser?.tipo || '';
  }

  get userName(): string {
    if (!this.currentUser) return '';
    const u: any = this.currentUser as any;
    const first = (u.nombres || u.Nombres || u.name || '').toString().trim();
    const last = (u.apellidos || u.Apellidos || u.lastname || u.lastName || '').toString().trim();
    if (first || last) return `${first} ${last}`.trim();
    // Fallback amable: usar la parte local del correo, titulizada
    if (u.correo) {
      const local = String(u.correo).split('@')[0] || '';
      if (local) {
        // Reemplazar separadores comunes por espacios y capitalizar palabras
        const pretty = local.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
          .split(' ')
          .map((w: string) => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
          .join(' ');
        return pretty || local;
      }
      return String(u.correo);
    }
    return '';
  }

  // Initials for circular avatar (e.g., "Pe Do" -> "PD"). Falls back to email local-part initials.
  get userInitials(): string {
    if (!this.currentUser) return '';
    const u: any = this.currentUser as any;
    const first = (u.nombres || u.Nombres || u.name || '').toString().trim();
    const last = (u.apellidos || u.Apellidos || u.lastname || u.lastName || '').toString().trim();
    let initials = '';
    if (first) initials += first.charAt(0);
    if (last) initials += last.charAt(0);
    if (!initials && u.correo) {
      const local = String(u.correo).split('@')[0] || '';
      const parts = local.replace(/[._-]+/g, ' ').trim().split(/\s+/);
      if (parts[0]) initials += parts[0].charAt(0);
      if (parts[1]) initials += parts[1].charAt(0);
    }
    return initials.toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Navegación según el rol del usuario
  get navigationItems(): any[] {
  let dashboardPath = '/dashboard';
  if (this.userRole === 'paciente') dashboardPath = '/dashboard/paciente';
  if (this.userRole === 'secretaria') dashboardPath = '/dashboard/secretaria';
  if (this.userRole === 'doctor') dashboardPath = '/dashboard/doctor';
    const baseItems = [
      { path: dashboardPath, icon: 'fas fa-home', label: 'Dashboard', roles: ['paciente', 'secretaria', 'administrador', 'doctor'] }
    ];

    const roleSpecificItems = [
      // Paciente
      { path: '/appointments/create', icon: 'fas fa-calendar-plus', label: 'Nueva Cita', roles: ['paciente', 'secretaria'] },
      { path: '/appointments/view', icon: 'fas fa-search', label: 'Consultar Cita', roles: ['paciente', 'secretaria', 'administrador', 'doctor'] },
      
  // Administrador
  { path: '/users', icon: 'fas fa-users', label: 'Usuarios', roles: ['administrador'] },
      
      // Doctor
      { path: '/doctor/schedule', icon: 'fas fa-calendar-alt', label: 'Mi Agenda', roles: ['doctor'] },
      
      // Secretaria
      { path: '/appointments/manage', icon: 'fas fa-tasks', label: 'Gestionar Citas', roles: ['secretaria', 'administrador'] },
      { path: '/secretary/patients', icon: 'fas fa-user-injured', label: 'Administración de Pacientes', roles: ['secretaria', 'administrador'] }
    ];

    return [...baseItems, ...roleSpecificItems].filter(item => 
      item.roles.includes(this.userRole)
    );
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }
}