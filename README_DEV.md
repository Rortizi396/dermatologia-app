# Dermatologia App — Desarrollo (dev)

Pequeñas notas y comandos útiles para arrancar el backend y frontend en desarrollo (Windows PowerShell).

Prerequisitos
- Node.js 18+ (o LTS compatible)
- npm
- MySQL local configurado con la base de datos `dermatologico` y credenciales en `server.js` (host, user, password)

Instalación (primera vez)
```powershell
# desde la carpeta del proyecto
npm install
# opcional: instalar angular cli global si no lo tienes
npm install -g @angular/cli
```

Scripts útiles
- Iniciar solo backend:
```powershell
npm run start:backend
```

- Iniciar solo frontend (Angular dev server):
```powershell
npm run start:frontend
```

- Iniciar ambos (desarrollo, usa concurrently):
```powershell
npm run start:dev
```

Comprobaciones rápidas
- Health endpoint (debe devolver success: true):
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/health -Method GET | ConvertTo-Json -Depth 4
```

- Listar citas (ejemplo con fecha):
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/citas?date=2025-10-18&page=1&limit=10" -Method GET | ConvertTo-Json -Depth 6
```

Depuración
- Si el servidor Node no arranca, revisa el log en la terminal donde lo iniciaste. El servicio imprimirá errores de conexión a MySQL y trazas en `/api/citas` cuando se le invoque.
- Verifica que MySQL esté corriendo y que las credenciales en `server.js` sean correctas.

Notas
- `start:dev` usa `concurrently`. Si no quieres instalar dependencias globales, ejecuta ambos scripts en terminales separados.
- El proxy de Angular está definido en `proxy.conf.json` para redirigir `/api` al backend durante `ng serve`.
