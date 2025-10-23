-- Suggested indexes to speed up FK joins and lookups
-- Note: column names are lowercase because Postgres folds unquoted identifiers to lowercase

CREATE INDEX IF NOT EXISTS idx_citas_consulta_especialidad ON public.citas (consulta_especialidad);
CREATE INDEX IF NOT EXISTS idx_citas_profesional_responsable ON public.citas (profesional_responsable);
CREATE INDEX IF NOT EXISTS idx_citas_paciente ON public.citas (paciente);

CREATE INDEX IF NOT EXISTS idx_ehd_doctores_colegiado ON public.especialidades_has_doctores (doctores_colegiado);
CREATE INDEX IF NOT EXISTS idx_ehd_especialidades_id ON public.especialidades_has_doctores (especialidades_idespecialidades);

CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON public.usuarios (correo);

-- Update planner statistics
ANALYZE;
