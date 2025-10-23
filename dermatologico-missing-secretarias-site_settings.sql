-- Create secretarias, site_settings, site_settings_audit tables and insert rows

CREATE TABLE IF NOT EXISTS secretarias (
  idSecretarias serial PRIMARY KEY,
  Nombres varchar(45) NOT NULL,
  Apellidos varchar(45) NOT NULL,
  Telefono varchar(45) NOT NULL,
  Correo varchar(45) NOT NULL,
  Activo varchar(5)
);

INSERT INTO secretarias (idSecretarias,Nombres,Apellidos,Telefono,Correo,Activo) VALUES
(1,'Juana Cecilia','Perez','12354687','juana@ejemplo.com','Si') ON CONFLICT (idSecretarias) DO NOTHING;

CREATE TABLE IF NOT EXISTS site_settings (
  key varchar(100) PRIMARY KEY,
  value text
);

INSERT INTO site_settings (key,value) VALUES
('mission','Brindar salud y bienestar a nuestros pacientes gui├índolos en el proceso de cuidar y amar su piel ofreciendo los mejores tratamientos que permitan potenciar el poder del amor propio'),
('vision','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS site_settings_audit (
  id serial PRIMARY KEY,
  key varchar(100),
  old_value text,
  new_value text,
  changed_by varchar(255),
  changed_at timestamp DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO site_settings_audit (id,key,old_value,new_value,changed_by,changed_at) VALUES
(1,'mission','Misi´┐¢n actualizada - prueba ruta espec´┐¢fica','Misi´┐¢nregistro auditor´┐¢a prueba',NULL,'2025-10-18 05:50:12'),
(2,'vision',NULL,'Hola','carlos@ejemplo.com','2025-10-18 08:13:28'),
(3,'vision','Hola','Hola','carlos@ejemplo.com','2025-10-18 08:13:33'),
(4,'mission','Misi´┐¢nregistro auditor´┐¢a prueba','Prueba','carlos@ejemplo.com','2025-10-18 17:15:43'),
(5,'mission','Prueba','Prueba','carlos@ejemplo.com','2025-10-18 17:15:44'),
(6,'mission','Prueba','Brindar salud y bienestar a nuestros pacientes gui├índolos en el proceso de cuidar y amar su piel ofreciendo los mejores tratamientos que permitan potenciar el poder del amor propio','carlos@ejemplo.com','2025-10-19 09:15:36'),
(7,'vision','Hola','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','carlos@ejemplo.com','2025-10-19 09:15:37'),
(8,'vision','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','carlos@ejemplo.com','2025-10-19 09:15:39'),
(9,'vision','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','carlos@ejemplo.com','2025-10-19 09:15:40')
ON CONFLICT (id) DO NOTHING;
