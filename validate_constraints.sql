-- Validate all constraints added as NOT VALID
-- We will validate each foreign key constraint seen in create_indexes_fks.sql

ALTER TABLE citas VALIDATE CONSTRAINT FK_Doc_Cita;
ALTER TABLE citas VALIDATE CONSTRAINT FK_Esp_Cita;
ALTER TABLE especialidades_has_doctores VALIDATE CONSTRAINT fk_Especialidades_has_Doctores_Doctores1;
ALTER TABLE especialidades_has_doctores VALIDATE CONSTRAINT fk_Especialidades_has_Doctores_Especialidades1;

-- Add any other VALIDATE statements as needed
