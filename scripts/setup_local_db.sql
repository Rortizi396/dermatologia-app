-- SQL helper for local development
-- Run these commands in your local MySQL shell (or via a client) to create the database and user

-- Create the database
CREATE DATABASE IF NOT EXISTS dermatologico CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user and grant privileges (change 'appuser' and 's3cret' to your preferred creds)
CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 's3cret';
GRANT ALL PRIVILEGES ON dermatologico.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;

-- Example for Postgres (run as a postgres superuser):
-- CREATE USER appuser WITH PASSWORD 's3cret';
-- CREATE DATABASE dermatologico;
-- GRANT ALL PRIVILEGES ON DATABASE dermatologico TO appuser;

-- After running the SQL above, copy `.env.example` to `.env` and set DB_USER/DB_PASSWORD accordingly
