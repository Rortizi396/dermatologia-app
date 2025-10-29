-- Create the join table especialidades_has_doctores and insert rows
CREATE TABLE IF NOT EXISTS especialidades_has_doctores (
  Especialidades_idEspecialidades integer NOT NULL,
  Doctores_Colegiado integer NOT NULL,
  Ref serial PRIMARY KEY
);

INSERT INTO especialidades_has_doctores (Especialidades_idEspecialidades,Doctores_Colegiado,Ref) VALUES
(1,99935,1),(2,99935,2)
ON CONFLICT (Ref) DO NOTHING;
