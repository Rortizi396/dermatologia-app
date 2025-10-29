-- Validate FK constraints with actual names
ALTER TABLE citas VALIDATE CONSTRAINT fk_doc_cita;
ALTER TABLE citas VALIDATE CONSTRAINT fk_esp_cita;
-- If there are more constraints, add them here
