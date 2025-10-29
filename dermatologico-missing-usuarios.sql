-- Create usuarios table and insert rows (Postgres-compatible)
CREATE TABLE IF NOT EXISTS usuarios (
  idUsuarios serial PRIMARY KEY,
  correo varchar(45) NOT NULL,
  contrasenia varchar(255),
  Tipo varchar(255) NOT NULL,
  Estado varchar(255) NOT NULL
);

INSERT INTO usuarios (idUsuarios,correo,contrasenia,Tipo,Estado) VALUES
(1,'roberto@ejemplo.com','$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2','Paciente','Si'),
(2,'roberto@ejemplo.com','$2b$10$noOxr8BjjGYWZKBsEVgEp.17kbfvwJEJ8vfMTBcyssZ3uOnDMdXC6','Paciente','Si'),
(3,'roberto@ejemplo.com','$2b$10$QvHtfx0N9R/J8urgCkE/9u4VaYxll3M02bpxpzHiM6paueKPLyyCG','Paciente','No'),
(4,'paciente@ejemplo.com','$2b$10$y55ELFFz9XA/8yR4CpQ9MOJXiBhbuadvRpI4t.QdvdwgYT4PJdJJK','Paciente','Si'),
(5,'carlos@ejemplo.com','$2b$10$2RWBQARuIlpZmJ1Lw8JhEelLxjVAtz2SecLDIMWriTFiUtQBZA3z.','Administrador','Si'),
(6,'carlos@ejemplo.com','$2b$10$NL5ynZu3QyZ39dvw7FcYn.7pco1yoCNyxzUGG5hvyzVFGcLAl1Guu','Administrador','No'),
(7,'julio@ejemplo.com','$2b$10$U.oSe4DvAHFb17pxVffnrenwTFphtyXk0Gb/.Z7BAKnIRB8HdntoG','Doctor','No'),
(8,'mario@ejemplo.com','$2b$10$bNBU9M2F5P3lryADEbTzHOYpPSAmSPugjBitEG6ENmYh8uhx8ejMy','Doctor','No'),
(9,'carloslopez@ejemplo.com','$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C','Doctor','No'),
(10,'julia@ejemplo.com','$2b$10$EjQKkLtWGZumGhLNGYfk8u.5UUJngpJtM5NL/kzFzPspvS/iSqvI6','Doctor','Si'),
(11,'carlos@ejemplo.com','$2b$10$Ix9X0BoY9R9U80azMn8/6.7NrU7h.qOPRvAxVgOOQPHmg7A8AjPYS','Doctor','No'),
(12,'manolo@ejemplo.com','$2b$10$ID6nQs.rS7.GIzRB6sJFM.AXoXzcn5yUtL4.KXQSpyfVPH.Z7qzYO','Paciente','Si'),
(13,'roo@ejemplo.com','$2b$10$CGCQosU1AFMfUdy9HndgWe89dbV5sXw4koZM2gRGqEoibJIy.p9DC','Doctor','Si'),
(14,'roo@ejemplo.com','$2b$10$jlwxOa6pi1ztEYL9R.E2..HG.0Pl9cuX97BM3OFL7mMYhzMtNGaA.','Doctor','Si'),
(15,'roo@ejemplo.com','$2b$10$CuYc.U6PAF0sBxlKu6/BcePZg7aVUnGGvl8aDAvW/LEZfjjAgc1QC','Doctor','Si'),
(16,'juana@ejemplo.com','$2b$10$puUwrejZQPqgoGE83OZ0v..RdQ6dXsMITPOZ9gPl89mbayE6ZCMlS','Secretaria','Si')
ON CONFLICT (idUsuarios) DO NOTHING;
