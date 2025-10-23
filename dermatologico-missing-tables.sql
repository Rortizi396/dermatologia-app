-- Postgres-compatible CREATE TABLEs for missing tables: doctores, especialidades
-- Derived from dermatologico-mysql.sql transformed to PG types

CREATE TABLE IF NOT EXISTS doctores (
  Colegiado integer NOT NULL,
  Nombres varchar(45) NOT NULL,
  Apellidos varchar(45) NOT NULL,
  Especialidad varchar(255) NOT NULL,
  Telefono varchar(45) NOT NULL,
  Correo varchar(45) NOT NULL,
  Activo varchar(5),
  PRIMARY KEY (Colegiado)
);

CREATE TABLE IF NOT EXISTS especialidades (
  idEspecialidades serial PRIMARY KEY,
  Nombre varchar(45) NOT NULL,
  Descripcion varchar(255) NOT NULL
);

-- Insert existing rows (best-effort). These INSERTs are taken from the original MySQL dump.
INSERT INTO doctores (Colegiado,Nombres,Apellidos,Especialidad,Telefono,Correo,Activo) VALUES
(54,'','','','', 'carlos@ejemplo.com','SI'),
(12345,'julio','lopez','','45648996','julio@ejemplo.com','SI'),
(85549,'Mario','Perez','Dermatologia general,Psicologia','88663147','mario@ejemplo.com','SI'),
(88885,'carlos','lopez','Dermatologia general,Psicologia','84986456','carloslopez@ejemplo.com','SI'),
(99935,'Marta julia','manrique','Dermatologia general,Psicologia','64654634','julia@ejemplo.com','Si')
ON CONFLICT (Colegiado) DO NOTHING;

INSERT INTO especialidades (idEspecialidades,Nombre,Descripcion) VALUES
(1,'Dermatologia general','Dermatologia a nivel general'),
(2,'Psicologia','Apoya a pacientes con afecciones dermatologicas'),
(3,'Dermatologia intensiva','Para casos generales graves'),
(4,'Pediatria','')
ON CONFLICT (idEspecialidades) DO NOTHING;
