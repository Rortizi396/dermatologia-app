-- Create pacientes table and insert rows (from original MySQL dump), Postgres-compatible
CREATE TABLE IF NOT EXISTS pacientes (
  DPI bigint PRIMARY KEY,
  Nombres varchar(45) NOT NULL,
  Apellidos varchar(45) NOT NULL,
  Telefono varchar(45) NOT NULL,
  Correo varchar(45) NOT NULL,
  Activo varchar(5)
);

INSERT INTO pacientes (DPI,Nombres,Apellidos,Telefono,Correo,Activo) VALUES
(466546564687,'pepe','dominguez','12345678','paciente@ejemplo.com','SI'),
(1234567891234,'Roberto Carlos','Ortiz','48863190','roberto@ejemplo.com','Si'),
(7894561237894,'manolo','perez','48567832','manolo@ejemplo.com','SI')
ON CONFLICT (DPI) DO NOTHING;
