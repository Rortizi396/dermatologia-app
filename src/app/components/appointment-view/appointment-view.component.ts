// appointment-view.component.ts
import { Component, OnInit } from '@angular/core';
import { AppointmentService } from '../../services/appointment.service';
import { PdfGeneratorUtil } from '../../utils/pdf-generator.util';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-appointment-view',
  templateUrl: './appointment-view.component.html',
  styleUrls: ['./appointment-view.component.css'],
  standalone: false,
})
export class AppointmentViewComponent implements OnInit {
  found: boolean = false;
  appointmentId: number = 0;
  appointment: any;
  errorMessage: string = '';
  loading: boolean = false;
  actionLoading: boolean = false; // disables action buttons during API calls
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | null = null;

  pdfGenerator = new PdfGeneratorUtil();
  constructor(private appointmentService: AppointmentService, private toastService: ToastService) { }
  ngOnInit(): void {
    // Puedes agregar lógica aquí si lo necesitas al inicializar el componente
  }

  searchAppointment(): void {
    if (this.appointmentId) {
      this.loading = true;
      this.appointmentService.getAppointmentById(this.appointmentId).subscribe(
        (response: any) => {
          console.log('[searchAppointment] Datos recibidos:', response);
          if (response && response.success && response.appointment) {
            this.appointment = response.appointment;
            console.log('[searchAppointment] Valor Confirmado:', this.appointment.Confirmado);
            this.found = true;
            this.errorMessage = '';
          } else {
            this.appointment = null;
            this.found = false;
            this.errorMessage = 'No se encontró la cita con el ID proporcionado';
          }
          this.loading = false;
        },
        error => {
          this.errorMessage = 'No se encontró la cita con el ID proporcionado';
          this.appointment = null;
          this.found = false;
          this.loading = false;
        }
      );
    }
  }

  confirmAppointment(): void {
    if (!this.appointment || !this.appointment.idCitas) return;
    this.loading = true;
    this.actionLoading = true;
    this.appointmentService.confirmAppointment(this.appointment.idCitas).subscribe(
      (response: any) => {
        if (response.success) {
          // Backend should return new state; fall back to 'Confirmada'
          this.appointment.Confirmado = response.updatedStatus || 'Confirmada';
          this.errorMessage = '';
          this.toastService.show('Cita confirmada correctamente', 'success');
        } else {
          this.errorMessage = 'No se pudo confirmar la cita.';
          this.toastService.show('No se pudo confirmar la cita', 'error');
        }
        this.loading = false;
        this.actionLoading = false;
      },
      error => {
        this.errorMessage = 'Error al confirmar la cita.';
  this.toastService.show('Error al confirmar la cita', 'error');
        this.loading = false;
        this.actionLoading = false;
      }
    );
  }

  cancelAppointment(): void {
    if (!this.appointment || !this.appointment.idCitas) return;
    if (!confirm('¿Está seguro que desea cancelar esta cita?')) return;
    this.loading = true;
    this.actionLoading = true;
    this.appointmentService.cancelAppointment(this.appointment.idCitas).subscribe(
      (response: any) => {
        if (response.success) {
          // Backend should return updated status; fall back to 'Cancelada'
          this.appointment.Confirmado = response.updatedStatus || 'Cancelada';
          this.errorMessage = '';
          this.toastService.show('Cita cancelada correctamente', 'success');
        } else {
          this.errorMessage = 'No se pudo cancelar la cita.';
          this.toastService.show('No se pudo cancelar la cita', 'error');
        }
        this.loading = false;
        this.actionLoading = false;
      },
      error => {
        this.errorMessage = 'Error al cancelar la cita.';
  this.toastService.show('Error al cancelar la cita', 'error');
        this.loading = false;
        this.actionLoading = false;
      }
    );
  }

  // Toasts now provided by ToastService

  generateTicket(): void {
    if (this.appointment) {
      this.pdfGenerator.generateAppointmentTicket(this.appointment);
    }
  }

  clearSearch(): void {
  this.appointmentId = 0;
  this.appointment = null;
  this.found = false;
  this.errorMessage = '';
  }
}