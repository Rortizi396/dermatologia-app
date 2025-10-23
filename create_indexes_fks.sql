-- Auto-generated FK constraints (NOT VALID). Review before validating.
ALTER TABLE ONLY citas ADD CONSTRAINT FK_Doc_Cita FOREIGN KEY (Profesional_Responsable) REFERENCES doctores (Colegiado) ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
ALTER TABLE ONLY citas ADD CONSTRAINT FK_Esp_Cita FOREIGN KEY (Consulta_Especialidad) REFERENCES especialidades (idEspecialidades) ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
