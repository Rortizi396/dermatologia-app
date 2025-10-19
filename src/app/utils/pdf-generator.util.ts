// pdf-generator.util.ts
import { jsPDF } from 'jspdf';

export class PdfGeneratorUtil {
  generateAppointmentTicket(appointment: any): void {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 150);
    doc.text('Centro Dermatológico', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Comprobante de Cita Médica', 105, 30, { align: 'center' });
    
    // Línea separadora
    doc.line(20, 35, 190, 35);
    
    // Información de la cita
    doc.setFontSize(12);
    doc.text(`Número de Cita: ${appointment.idCitas}`, 20, 45);
    doc.text(`Fecha: ${appointment.Fecha}`, 20, 55);
    doc.text(`Hora: ${appointment.Hora}`, 20, 65);
    
    // Información del paciente
    doc.text(`Paciente: ${appointment.patientNames} ${appointment.patientLastNames}`, 20, 80);
    doc.text(`DPI: ${appointment.patientDpi}`, 20, 90);
    doc.text(`Teléfono: ${appointment.patientPhone}`, 20, 100);
    doc.text(`Email: ${appointment.patientEmail}`, 20, 110);
    
    // Información médica
    doc.text(`Especialidad: ${appointment.specialtyName}`, 20, 125);
    doc.text(`Doctor: ${appointment.doctorName}`, 20, 135);
    
    if (appointment.observations) {
      doc.text(`Observaciones: ${appointment.observations}`, 20, 150);
    }
    
    // Pie de página
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Por favor presente este comprobante el día de su cita', 105, 180, { align: 'center' });
    doc.text('Llegar 15 minutos antes de la hora programada', 105, 185, { align: 'center' });
    
    // Guardar el PDF
    doc.save(`cita-${appointment.idCitas}.pdf`);
  }
}