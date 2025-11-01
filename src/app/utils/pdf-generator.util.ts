// pdf-generator.util.ts
import { jsPDF } from 'jspdf';

export class PdfGeneratorUtil {
  generateAppointmentTicket(appointment: any): void {
    const doc = new jsPDF();

    // Normalize backend field casing and provide sensible fallbacks
    const pick = (o: any, keys: string[], def: any = '') => {
      for (const k of keys) {
        if (o && typeof o[k] !== 'undefined' && o[k] !== null) return o[k];
      }
      return def;
    };

    const idCitas = pick(appointment, ['idCitas','idcitas','id','ID'], '');
    const fechaRaw = pick(appointment, ['Fecha','fecha'], '');
    const horaRaw = pick(appointment, ['Hora','hora'], '');
    const patientNames = pick(appointment, ['patientNames','patientnames','Nombres','nombres'], '');
    const patientLastNames = pick(appointment, ['patientLastNames','patientlastnames','Apellidos','apellidos'], '');
    const patientDpi = pick(appointment, ['patientDpi','patientdpi','Paciente','paciente','dpi','DPI'], '');
    const patientPhone = pick(appointment, ['patientPhone','patientphone','Telefono','telefono'], '');
    const patientEmail = pick(appointment, ['patientEmail','patientemail','Correo','correo','email','Email'], '');
    const specialtyName = pick(appointment, ['specialtyName','specialtyname','NombreEspecialidad','Nombre','nombre'], '');
    const doctorFirst = pick(appointment, ['doctorName','doctorname','Nombres','nombres','doctorFirst','doctorfirst'], '');
    const doctorLast = pick(appointment, ['doctorLastNames','doctorlastnames','Apellidos','apellidos','doctorLast','doctorlast'], '');
    const observaciones = pick(appointment, ['Observaciones','observaciones','observations'], '');

    // Format date/time gracefully
    const Fecha = (typeof fechaRaw === 'string' && fechaRaw.length > 10) ? fechaRaw.slice(0,10) : (fechaRaw || '');
    const Hora = (typeof horaRaw === 'string' && horaRaw.length >= 5) ? horaRaw.slice(0,5) : (horaRaw || '');
    
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
  doc.text(`Número de Cita: ${idCitas || 'N/A'}`, 20, 45);
  doc.text(`Fecha: ${Fecha || 'N/A'}`, 20, 55);
  doc.text(`Hora: ${Hora || 'N/A'}`, 20, 65);
    
    // Información del paciente
  doc.text(`Paciente: ${[patientNames, patientLastNames].filter(Boolean).join(' ') || 'N/A'}`, 20, 80);
  doc.text(`DPI: ${patientDpi || 'N/A'}`, 20, 90);
  doc.text(`Teléfono: ${patientPhone || 'N/A'}`, 20, 100);
  doc.text(`Email: ${patientEmail || 'N/A'}`, 20, 110);
    
    // Información médica
  doc.text(`Especialidad: ${specialtyName || 'N/A'}`, 20, 125);
  doc.text(`Doctor: ${[doctorFirst, doctorLast].filter(Boolean).join(' ') || 'N/A'}`, 20, 135);
    
    if (observaciones) {
      doc.text(`Observaciones: ${observaciones}`, 20, 150);
    }
    
    // Pie de página
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Por favor presente este comprobante el día de su cita', 105, 180, { align: 'center' });
    doc.text('Llegar 15 minutos antes de la hora programada', 105, 185, { align: 'center' });
    
    // Guardar el PDF
    const fileId = idCitas || new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    doc.save(`cita-${fileId}.pdf`);
  }
}