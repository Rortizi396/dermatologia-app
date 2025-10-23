-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: host.docker.internal    Database: dermatologico
-- ------------------------------------------------------
-- Server version	8.0.43

;
;
;
;
;
;
;
;
;
;

--
-- Current Database: dermatologico
--

--
-- Table structure for table administradores
--

DROP TABLE IF EXISTS administradores;
;
;
CREATE TABLE administradores (
  idAdministradores SERIAL,
  Nombres varchar(45) NOT NULL,
  Apellidos varchar(45) NOT NULL,
  Correo varchar(45) NOT NULL,
  Activo varchar(5) DEFAULT NULL,
  PRIMARY KEY (idAdministradores)
);
;

--
-- Dumping data for table administradores
--

--
-- Table structure for table audit_log
--

DROP TABLE IF EXISTS audit_log;
;
;
CREATE TABLE audit_log (
  id SERIAL,
  event_type varchar(100) DEFAULT NULL,
  resource_type varchar(100) DEFAULT NULL,
  resource_id varchar(255) DEFAULT NULL,
  old_value text,
  new_value text,
  changed_by varchar(255) DEFAULT NULL,
  ip varchar(100) DEFAULT NULL,
  user_agent text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
;

--
-- Dumping data for table audit_log
--

--
-- Table structure for table citas
--

DROP TABLE IF EXISTS citas;
;
;
CREATE TABLE citas (
  idCitas SERIAL,
  Paciente bigint DEFAULT NULL,
  Consulta_Especialidad int NOT NULL,
  Profesional_Responsable int NOT NULL,
  Observaciones varchar(255) NOT NULL,
  Fecha date NOT NULL,
  Hora time NOT NULL,
  Confirmado varchar(255) NOT NULL,
  Id_Creador int NOT NULL,
  Tipo_Creador varchar(255) NOT NULL,
  PRIMARY KEY (idCitas)
);




-- Converted index notes (please review)
-- NOTE: original index FK_Esp_Cita_idx on columns (Consulta_Especialidad). Please review and create appropriate index if desired.
-- NOTE: original index FK_Doc_Cita_idx on columns (Profesional_Responsable). Please review and create appropriate index if desired.
-- NOTE: original index FK_Pac_Cita_idx on columns (Paciente). Please review and create appropriate index if desired.
-- NOTE: original index fk_Especialidades_has_Doctores_Doctores1_idx on columns (Doctores_Colegiado). Please review and create appropriate index if desired.
-- NOTE: original index fk_Especialidades_has_Doctores_Especialidades1_idx on columns (Especialidades_idEspecialidades). Please review and create appropriate index if desired.
