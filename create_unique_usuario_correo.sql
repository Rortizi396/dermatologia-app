-- Create UNIQUE index on usuarios.correo to prevent duplicates
-- Use CONCURRENTLY to avoid locking heavy operations; if your Render plan doesn't allow CONCURRENTLY or you get permission errors, run without CONCURRENTLY.

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_correo_unique ON public.usuarios (correo);

-- Update statistics
ANALYZE public.usuarios;
