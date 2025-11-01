import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
// import { RegisterComponent } from './components/login/register.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AppointmentCreateComponent } from './components/appointment-create/appointment-create.component';
import { AppointmentViewComponent } from './components/appointment-view/appointment-view.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { UserCreateComponent } from './components/user-management/user-create.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
// import { DoctorScheduleComponent } from './components/doctor-schedule/doctor-schedule.component';

const routes: Routes = [
  {
    path: 'doctor/schedule',
    component: require('./components/doctor-schedule/doctor-schedule.component').DoctorScheduleComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./components/login/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'mission-vision',
    loadComponent: () => import('./components/mission-vision/mission-vision.component').then(m => m.MissionVisionComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'audit-history',
    loadComponent: () => import('./components/audit-history-page/audit-history-page.component').then(m => m.AuditHistoryPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin-appointments',
    loadComponent: () => import('./components/admin-appointments/admin-appointments.component').then(m => m.AdminAppointmentsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'appointments/manage',
    loadComponent: () => import('./components/admin-appointments/admin-appointments.component').then(m => m.AdminAppointmentsComponent),
    canActivate: [AuthGuard]
  },
  // Redirección automática a login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // Ruta de login
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', loadComponent: () => import('./components/login/forgot-password.component').then(m => m.ForgotPasswordComponent) },

  // Ruta de no autorizado
  {
    path: 'unauthorized',
    loadComponent: () => import('./components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  // ...
  {
    path: 'admin-panel',
    loadComponent: () => import('./components/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  
  // Rutas protegidas (requieren autenticación)
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard] 
  },
  {
    path: 'dashboard/paciente',
    loadComponent: () => import('./components/patient-dashboard/patient-dashboard.component').then(m => m.PatientDashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard/secretaria',
    loadComponent: () => import('./components/secretary-dashboard/secretary-dashboard.component').then(m => m.SecretaryDashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'secretary/patients',
    loadComponent: () => import('./components/secretary-patients/secretary-patients.component').then(m => m.SecretaryPatientsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['secretaria', 'administrador'] }
  },
  {
    path: 'dashboard/doctor',
    loadComponent: () => import('./components/doctor-dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'appointments/create', 
    component: AppointmentCreateComponent,
    canActivate: [AuthGuard] 
  },
  { 
    path: 'appointments/view', 
    component: AppointmentViewComponent,
    canActivate: [AuthGuard] 
  },
  { 
    path: 'users', 
    component: UserManagementComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'users/create',
    component: UserCreateComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  
  // Ruta comodín para páginas no encontradas
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }