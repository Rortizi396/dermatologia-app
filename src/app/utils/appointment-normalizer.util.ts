// Shared appointment normalizer used across components
export function normalizeAppointment(c: any): any {
  if (!c || typeof c !== 'object') return c;
  // clone to avoid mutating external references unexpectedly
  c = { ...c };

  // id variants
  c.idCitas = c.idCitas ?? c.idcitas ?? c.id ?? c.Id ?? c.CitaId ?? c.citaId ?? null;

  // numero aliases (fallback a id si no hay número explícito)
  c.numero = c.numero ?? c.CitaNumero ?? c.Cita_Numero ?? c.Cita_Num ?? c.nro ?? c.Nro ?? c.idCitas ?? c.id ?? c.Id ?? null;
  c.CitaNumero = c.CitaNumero ?? c.numero ?? c.Cita_Numero;

  // fecha/hora variants
  c.fecha = c.fecha ?? c.Fecha ?? c.fecha_cita ?? c.fechaHora ?? null;
  try {
    if (c.fecha && typeof c.fecha === 'string') {
      const parsed = new Date(c.fecha);
      if (!isNaN(parsed.getTime())) c.fecha = parsed;
    }
  } catch (e) {}
  c.hora = c.hora ?? c.Hora ?? c.hora_cita ?? c.horaTurno ?? null;
  // Mantener también las variantes con mayúscula para plantillas existentes
  c.Fecha = c.Fecha ?? c.fecha ?? null;
  c.Hora = c.Hora ?? c.hora ?? null;

  // paciente info
  c.pacienteInfo = c.pacienteInfo ?? {};
  if ((!c.pacienteInfo.nombres || !c.pacienteInfo.apellidos)) {
    if (c.pacientenombres || c.pacienteNombres) c.pacienteInfo.nombres = c.pacientenombres || c.pacienteNombres;
    if (c.pacienteapellidos || c.pacienteApellidos) c.pacienteInfo.apellidos = c.pacienteapellidos || c.pacienteApellidos;
    if (!c.pacienteInfo.nombres && c.Paciente) c.pacienteInfo.nombres = c.Paciente;
  }

  // DPI y Email del paciente (top-level para plantillas)
  const dpiFromDetail = c.patientDpi ?? c.patientdpi ?? c.pacienteDpi ?? c.paciente_dpi ?? c.DPI ?? c.dpi ?? null;
  const emailFromDetail = c.patientEmail ?? c.patientemail ?? c.pacienteEmail ?? c.paciente_email ?? c.Correo ?? c.correo ?? c.email ?? null;
  c.pacienteInfo.dpi = c.pacienteInfo.dpi ?? dpiFromDetail;
  c.pacienteInfo.email = c.pacienteInfo.email ?? emailFromDetail;
  c.patientDpi = c.patientDpi ?? c.patientdpi ?? c.pacienteInfo.dpi ?? dpiFromDetail;
  c.patientEmail = c.patientEmail ?? c.patientemail ?? c.pacienteInfo.email ?? emailFromDetail;

  // telefono variants
  const phoneFromDetail = c.patientPhone ?? c.patientphone ?? c.pacienteTelefono ?? c.pacientePhone ?? c.Telefono ?? c.telefono ?? null;
  c.pacienteInfo.telefono = c.pacienteInfo.telefono ?? phoneFromDetail;
  c.patientPhone = c.patientPhone ?? c.patientphone ?? c.pacienteInfo.telefono ?? phoneFromDetail;

  // doctor info
  c.doctorInfo = c.doctorInfo ?? {};
  if ((!c.doctorInfo.nombres || !c.doctorInfo.apellidos)) {
    if (c.doctornombres || c.doctorNombres) c.doctorInfo.nombres = c.doctornombres || c.doctorNombres;
    if (c.doctorapellidos || c.doctorApellidos) c.doctorInfo.apellidos = c.doctorapellidos || c.doctorApellidos;
    if (!c.doctorInfo.nombres && c.Profesional_Responsable) c.doctorInfo.nombres = c.Profesional_Responsable;
  }

  // especialidad info
  c.especialidadInfo = c.especialidadInfo ?? {};
  const spec = c.especialidadInfo?.Nombre ?? c.especialidadNombre ?? c.especialidadnombre ?? c.Consulta_Especialidad ?? c.consulta_Especialidad ?? c.especialidad ?? null;
  c.especialidadInfo.Nombre = c.especialidadInfo.Nombre ?? spec ?? null;

  // normalize nested patient name fields
  c.pacienteInfo.nombres = c.pacienteInfo.nombres ?? c.pacienteNombres ?? c.patientNames ?? c.pacienteNombre ?? c.paciente ?? c.patientName ?? null;
  c.pacienteInfo.apellidos = c.pacienteInfo.apellidos ?? c.pacienteApellidos ?? c.patientLastNames ?? c.pacienteApellido ?? null;

  // normalize doctor fields
  c.doctorInfo.nombres = c.doctorInfo.nombres ?? c.doctorNombres ?? c.profesional_Responsable ?? c.profesionalResponsable ?? c.DoctorNombre ?? null;
  c.doctorInfo.apellidos = c.doctorInfo.apellidos ?? c.doctorApellidos ?? null;

  // Top-level aliases commonly used in plantillas
  c.patientNames = c.patientNames ?? c.patientnames ?? c.pacientenombres ?? c.pacienteNombres ?? c.pacienteInfo?.nombres ?? null;
  c.patientLastNames = c.patientLastNames ?? c.patientlastnames ?? c.pacienteapellidos ?? c.pacienteApellidos ?? c.pacienteInfo?.apellidos ?? null;
  c.specialtyName = c.specialtyName ?? c.specialtyname ?? c.especialidadInfo?.Nombre ?? null;
  c.doctorName = c.doctorName ?? c.doctorname ?? c.doctornombres ?? c.doctorNombres ?? c.doctorInfo?.nombres ?? null;
  c.doctorLastNames = c.doctorLastNames ?? c.doctorlastnames ?? c.doctorapellidos ?? c.doctorApellidos ?? c.doctorInfo?.apellidos ?? null;

  // ensure fecha/hora canonical fields again
  c.fecha = c.fecha ?? c.Fecha ?? null;
  c.hora = c.hora ?? c.Hora ?? null;
  c.Fecha = c.Fecha ?? c.fecha ?? null;
  c.Hora = c.Hora ?? c.hora ?? null;

  // Observaciones alias para plantillas
  c.observaciones = c.observaciones ?? c.Observaciones ?? c.observacion ?? null;
  c.Observaciones = c.Observaciones ?? c.observaciones ?? null;

  // normalize confirmation/status aliases - keep original if present but ensure a canonical .Confirmado exists
  const confirmed = c?.Confirmado ?? c?.confirmado ?? c?.estado ?? c?.status ?? c?.estado_confirmacion ?? null;
  if (confirmed !== null && confirmed !== undefined) c.Confirmado = confirmed;

  return c;
}

export default normalizeAppointment;
