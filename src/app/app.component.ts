// app.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { User } from './interfaces/user.interface';
import { filter } from 'rxjs/operators';

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
  currentRoute = '';

  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router
    , private toastService: ToastService
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

  updateSidebarVisibility(): void {
    // No mostrar sidebar en login y en algunas rutas específicas
    this.showSidebar = this.currentUser !== null && 
                      !this.currentRoute.includes('/login') &&
                      this.currentRoute !== '/';
  }

  get userRole(): string {
    return this.currentUser?.tipo || '';
  }

  get userName(): string {
    return this.currentUser ? `${this.currentUser.nombres} ${this.currentUser.apellidos}` : '';
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
      { path: '/appointments/manage', icon: 'fas fa-tasks', label: 'Gestionar Citas', roles: ['secretaria', 'administrador'] }
    ];

    return [...baseItems, ...roleSpecificItems].filter(item => 
      item.roles.includes(this.userRole)
    );
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }
}