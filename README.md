 # Dermatología App
 
 Documentación y pasos para levantar la aplicación (frontend + backend) localmente.

 
 Resumen
 - Frontend: Angular (aplicación en `src/`)

 - Backend: Node.js + Express (`server.js`) con base de datos MySQL (driver `mysql2`).
 
 Requisitos previos

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

 - Node.js (recomendado >=16)
 - npm (viene con Node) o yarn
 - MySQL 5.7+ o MariaDB

 
 Instalación y configuración

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

 1) Instalar dependencias (en la carpeta `dermatologia-app`):
 
 ```powershell

 npm install
 ```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

 2) Base de datos
 - Crea la base de datos (ejemplo):

 ```sql
 CREATE DATABASE IF NOT EXISTS dermatologico CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

 - El servidor intentará crear algunas tablas auxiliares automáticamente (audit_log, site_settings, user_preferences). Sin embargo, para las tablas principales (Usuarios, pacientes, doctores, secretarias, administradores, citas, especialidades) asegúrate de crearlas según tu modelo o carga un dump si lo tienes.

 
 3) Variables de entorno

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

 - Crea un archivo `.env` en la raíz del proyecto (`dermatologia-app`) con al menos las siguientes variables:
 
 ```
 JWT_SECRET=secreto
 DB_HOST=localhost
 DB_USER=root
 DB_PASSWORD=root
 DB_NAME=dermatologico
 PORT=3000
 ```
 
 4) Iniciar el backend
 
 ```powershell
 node .\server.js
 ```
 
 5) Iniciar el frontend (otra terminal)
 
 ```powershell
 ng serve --proxy-config proxy.conf.json
 ```
 
 Endpoints útiles
 - POST /api/auth/login — iniciar sesión
 - POST /api/auth/reset-password — restablecer contraseña (en la versión actual permite cambiar por correo sin token; inseguro para producción)
 - GET /api/specialties — obtener especialidades
 - GET /api/users — obtener todos los usuarios
 
 Notas de seguridad
 - El endpoint de restablecimiento de contraseña NO está protegido por token por simplicidad de desarrollo. Antes de desplegar en producción, implementar flujo de tokens por correo y verificación.
 - Añadir índices UNIQUE en `correo` en las tablas de usuarios para prevenir duplicados a nivel de BD.
 
 Dependencias principales
 - Node: express, mysql2, bcryptjs, jsonwebtoken, cors, dotenv
 - Frontend: @angular/* (ver package.json)
 
 Archivos añadidos/modificados importantes
 - `server.js` — servidor Express con endpoints y lógica de auditoría
 - `src/app/components/*` — componentes del frontend (usuario, login, doctor-schedule, etc.)
 - `src/assets/images/` — imágenes ejemplo
