# SciConf

Sistema web para la gestión de conferencias científicas, diseñado para apoyar procesos de inscripción, autenticación, administración de usuarios, revisión de propuestas y control de la agenda del evento.

SciConf combina un backend en Django REST Framework con un frontend en React + Vite, buscando ofrecer una experiencia moderna, segura y adaptable para equipos que gestionan congresos, simposios o eventos académicos.

## Estado actual

El proyecto está en desarrollo activo. Las funcionalidades ya implementadas y verificables en la base del sistema incluyen:

- Autenticación con JWT
- Registro y login de usuarios
- Recuperación de contraseña mediante código PIN
- Gestión de usuarios y roles
- Rutas protegidas y flujo de acceso por sesión
- Panel principal con módulos de navegación

Los siguientes módulos se encuentran en preparación o como pantallas placeholder dentro de la interfaz:

- Dashboard
- Artículos
- Versiones y revisiones
- Agenda

## Stack tecnológico

- Backend: Python, Django, Django REST Framework, Simple JWT
- Base de datos: PostgreSQL / Supabase
- Frontend: React 19, Vite, React Router DOM, Axios, React Hook Form, Zod
- Estilos: TailwindCSS
- Autenticación: JWT + localStorage en frontend
- Correos: SMTP para restablecimiento de contraseña

## Requisitos previos

- Python 3.10 o superior (se recomienda 3.12)
- Node.js 18+ y npm
- Git
- Base de datos PostgreSQL o un proyecto Supabase
- Credenciales SMTP si vas a enviar correos reales

## Estructura del proyecto

```text
SciConf/
├── crud/                     # Configuración principal del proyecto Django
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── users/                    # App principal del sistema
│   ├── migrations/
│   ├── models.py             # User, Role, PasswordResetCode
│   ├── serializers.py        # Serialización del API
│   ├── permissions.py        # Reglas de permisos por rol
│   ├── urls.py               # Endpoints principales
│   ├── views.py              # Login, reset, usuarios, roles
│   └── templates/
├── frontend/                 # Aplicación frontend en React
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── .env.example              # Plantilla de variables de entorno
├── .env                      # Variables locales (no se sube al repositorio)
├── manage.py                 # CLI de Django
├── requirements.txt          # Dependencias de Python
├── README.md                 # Documentación del proyecto
└── .gitignore
```

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/reidermunoz/SciConf.git
cd SciConf
```

### 2. Crear entorno virtual

Windows (PowerShell):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Windows (CMD):

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias del backend

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Copia el archivo de ejemplo y completa los datos:

```bash
copy .env.example .env
```

o en Linux/macOS:

```bash
cp .env.example .env
```

Ejemplo de contenido:

```ini
SECRET_KEY=tu_clave_secreta
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=postgres
DB_USER=postgres.tu_usuario
DB_PASSWORD=tu_password
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=correo_del_proyecto@gmail.com
EMAIL_HOST_PASSWORD=contraseña_de_aplicacion
DEFAULT_FROM_EMAIL=SciConf <correo_del_proyecto@gmail.com>
```

Si no deseas enviar correos reales durante desarrollo, puedes usar:

```ini
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 5. Ejecutar migraciones

```bash
python manage.py migrate
```

### 6. Crear superusuario (opcional pero recomendado)

```bash
python manage.py createsuperuser
```

### 7. Iniciar backend

```bash
python manage.py runserver
```

Backend disponible en:

```text
http://127.0.0.1:8000/
```

### 8. Configurar y ejecutar frontend

Abre otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en:

```text
http://localhost:5173/
```

## Flujo principal del sistema

La aplicación dispone de una capa de autenticación y control de acceso a rutas protegidas.

### Autenticación

- La ruta `/login` es la pantalla principal cuando no existe una sesión válida.
- El usuario puede iniciar sesión con correo o nombre de usuario y contraseña.
- El backend genera tokens JWT para cada sesión.

### Registro de usuarios

- La ruta `/register` permite crear nuevas cuentas.
- El sistema valida información como nombres, correo, usuario, institución, teléfono y contraseña.
- El rol por defecto suele ser `Autor`, salvo que exista un usuario administrador que asigne otro rol.

### Recuperación de contraseña

- La ruta `/forgot-password` tiene un flujo en dos pasos:
  1. Solicitud del código PIN mediante correo
  2. Confirmación del código y cambio de contraseña
- El PIN tiene vigencia de 15 minutos.

### Módulos de navegación

La interfaz cuenta con los siguientes accesos principales:

- Inicio
- Dashboard
- Usuarios
- Artículos
- Versiones y revisiones
- Agenda

## Endpoints principales de la API

La API backend funciona bajo el prefijo `/api/v1/`:

| Módulo | Endpoint | Método | Descripción |
|---|---|---|---|
| Login | `/api/v1/login/` | `POST` | Inicio de sesión |
| Recuperación | `/api/v1/password-reset/request/` | `POST` | Genera un PIN para restablecer la contraseña |
| Confirmación | `/api/v1/password-reset/confirm/` | `POST` | Verifica el PIN y actualiza la contraseña |
| Usuarios | `/api/v1/users/` | `GET`, `POST` | Listado y creación |
| Detalle de usuario | `/api/v1/users/{id}/` | `GET`, `PUT`, `DELETE` | Consulta y edición |
| Roles | `/api/v1/roles/` | `GET`, `POST` | Gestión de roles |
| Admin Django | `/admin/` | Web | Panel administrativo de Django |

## Seguridad y buenas prácticas

- Las contraseñas se almacenan con hashing.
- Las rutas sensibles están protegidas por validación de autenticación.
- Los permisos por rol se manejan en la capa de Django y en el frontend por acceso condicional.
- Los archivos `.env` no se deben subir al repositorio.

## Solución de problemas comunes

- Si aparece redirección automática a `/login`: normalmente es una señal de que no hay sesión activa.
- Error `OperationalError: could not translate host name`: revisa la conexión a la base de datos y las variables `DB_HOST` / `DB_PORT`.
- Error `SMTPAuthenticationError`: usa una contraseña de aplicación válida para Gmail o Google Workspace.
- Error `KeyError` de variables de entorno: verifica que exista el archivo `.env` y que coincida con `.env.example`.

## Contribución

Para colaborar en el proyecto:

1. Haz fork del repositorio.
2. Crea una rama para tu cambio.
3. Realiza los ajustes necesarios.
4. Verifica la funcionalidad relevante.
5. Abre un pull request describiendo el cambio.

## Licencia

Este proyecto se encuentra en desarrollo y su uso y distribución pueden definirse según la política del equipo o del propietario del repositorio.

| `¡Error de conexión con el backend!` en el frontend | El backend no está corriendo | Inicia el backend con `python manage.py runserver`. |
| `Scripts deshabilitados` en PowerShell | Política de ejecución de Windows | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell. |
