

import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
registerLocaleData(localeEs);
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AppointmentCreateComponent } from './components/appointment-create/appointment-create.component';
import { AppointmentViewComponent } from './components/appointment-view/appointment-view.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { AppointmentService } from './services/appointment.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { PdfGeneratorUtil } from './utils/pdf-generator.util';
import { DoctorScheduleComponent } from './components/doctor-schedule/doctor-schedule.component';
import { PatientDashboardComponent } from './components/patient-dashboard/patient-dashboard.component';
import { CalendarModule, DateAdapter } from 'angular-calendar';
// DatePipe is provided by BrowserModule/CommonModule; don't put it in imports
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    AppointmentCreateComponent,
    AppointmentViewComponent,
  DoctorScheduleComponent
  // UserManagementComponent (standalone, no va en declarations)
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    PatientDashboardComponent,
    HttpClientModule,
    ReactiveFormsModule,
      FormsModule,
    RouterModule,
    CalendarModule.forRoot({ provide: DateAdapter, useFactory: adapterFactory }),  
  ],
  providers: [
    AuthService,
    UserService,
    AppointmentService,
    PdfGeneratorUtil,
    AuthGuard,
    RoleGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
    ,
    { provide: LOCALE_ID, useValue: 'es' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }