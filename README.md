# SciConf

Sistema web para la gestión integral de conferencias científicas (**SciConf**), que incluye autenticación de usuarios basada en roles, tokens JWT, verificación CAPTCHA, gestión de comités, autores, ponencias y agenda del evento.

---

## 📋 Requisitos previos

Asegúrate de contar con lo siguiente instalado en tu equipo:

- **Python 3.10 o superior** (se recomienda 3.12 o 3.13)
- **Node.js 18+ LTS y npm**
- **Git**
- Cuenta o base de datos en **PostgreSQL / Supabase**
- *(Opcional para correos reales)* Cuenta de correo electrónico con acceso SMTP (ej. Gmail con contraseña de aplicación)

---

## 📁 Estructura del proyecto

```text
SciConf/
├── crud/                      # Configuración principal de Django (settings, urls, wsgi, asgi)
├── users/                     # App Django: usuarios, roles, JWT y recuperación de PIN
│   ├── migrations/            # Historial de migraciones (incluye 0004_seed_roles)
│   ├── models.py              # Modelos: User, Role, PasswordResetCode
│   ├── permissions.py         # Clases de permisos DRF por rol (IsAdminUser, IsAdminOrCommittee)
│   ├── serializers.py         # Serializadores DRF con blindaje de roles
│   ├── urls.py                # Rutas de la API (login, captcha, reset, users, roles)
│   └── views.py               # Controladores de auth, captcha, usuarios y roles
├── frontend/                  # Frontend en React 19 + Vite + TailwindCSS
│   ├── public/                # Favicon e imágenes públicas estáticas (SciConfLogo.png)
│   ├── src/
│   │   ├── api/               # Cliente Axios con interceptor JWT (userApi.js)
│   │   ├── assets/            # Logos e imágenes del sistema (SciConfWhiteCut.png)
│   │   ├── components/        # Componentes reutilizables (layout, header, sidebar, users)
│   │   ├── hooks/             # Hooks personalizados (useAuth.js)
│   │   ├── pages/
│   │   │   ├── auth/          # LoginForm.jsx (con CAPTCHA), RegisterForm.jsx, ForgotPassword.jsx
│   │   │   ├── users/         # Users.jsx, CreateUser.jsx, Profile.jsx
│   │   │   └── Home.jsx       # Panel principal del sistema
│   │   └── routes/            # Configuración de rutas privadas (ProtectedRoute, ManageUsersRoute)
├── manage.py                  # CLI de gestión de Django
├── requirements.txt           # Dependencias de Python (Django, DRF, SimpleJWT, psycopg2)
├── .env.example               # Plantilla de variables de entorno
└── .env                       # Variables de entorno locales (NO subir a Git)
```

---

## 🚀 Instalación y puesta en marcha

### 1. Clonar el repositorio y ubicarse en el proyecto

```bash
git clone https://github.com/reidermunoz/SciConf.git
cd SciConf
```

---

### 2. Configurar el Backend (Django)

#### A. Crear y activar el entorno virtual

- **Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
  *(Si PowerShell restringe scripts, ejecuta primero: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`)*

- **Windows (CMD):**
  ```cmd
  python -m venv venv
  venv\Scripts\activate.bat
  ```

- **Linux / macOS:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

#### B. Instalar dependencias del backend

Con el entorno virtual activado y desde la carpeta raíz:
```bash
pip install -r requirements.txt
```

#### C. Configurar las variables de entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto tomando como base `.env.example`:

- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Linux / macOS / CMD:**
  ```bash
  cp .env.example .env
  ```

Edita el archivo `.env` con las credenciales de tu base de datos y la configuración de correo:

```ini
# Configuración de Django
SECRET_KEY=clave-secreta-de-django
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Base de datos (PostgreSQL / Supabase)
DB_NAME=postgres
DB_USER=postgres.xxxxxxxxxxxxxxxxxxxx
DB_PASSWORD=tu_password_de_base_de_datos
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432

# Configuración de Correo Electrónico (SMTP - Remitente del Sistema)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=correo_general_del_proyecto@gmail.com
EMAIL_HOST_PASSWORD=contraseña_de_aplicacion_del_proyecto
DEFAULT_FROM_EMAIL=SciConf <correo_general_del_proyecto@gmail.com>

# (Opcional) Si un desarrollador no desea enviar correos reales en local,
# puede descomentar la siguiente línea para imprimir el PIN en su terminal:
# EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

> 🔑 **Notas de configuración del `.env`:**
> 1. **`SECRET_KEY`:** Puedes generar una clave aleatoria ejecutando:
>    ```powershell
>    python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
>    ```
> 2. **Correo centralizado del proyecto (`EMAIL_HOST_*`):**
>    - Para evitar que cada integrante configure su cuenta personal, el equipo cuenta con un **correo centralizado del sistema** cuyas credenciales se comparten internamente.
>    - Si no necesitas enviar correos en local, activa `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` para ver los códigos PIN en tu terminal.

#### D. Ejecutar migraciones en la base de datos

Aplica los modelos y datos iniciales (incluye la creación automática de los 3 roles del sistema):
```bash
python manage.py migrate
```

#### E. Crear usuario y asignarse rol de Administrador

1. Crea un usuario desde el registro web (`/register`) o un superusuario en terminal:
   ```bash
   python manage.py createsuperuser
   ```
2. Para asignarle el rol de **Administrador del Sistema** en la base de datos a tu cuenta:
   ```powershell
   python manage.py shell -c "from users.models import User, Role; u = User.objects.get(email='TU_CORREO'); u.role = Role.objects.get(name='Administrador del Sistema'); u.is_staff = True; u.is_superuser = True; u.save(); print(f'Listo: {u.email} es Administrador')"
   ```

#### F. Iniciar el servidor backend

```bash
python manage.py runserver
```
El servidor backend quedará disponible en: **`http://127.0.0.1:8000/`**

---

### 3. Configurar el Frontend (React + Vite)

Abre **otra terminal** independiente para el frontend:

#### A. Ingresar a la carpeta del frontend
```bash
cd frontend
```

#### B. Instalar dependencias de Node.js
```bash
npm install
```

#### C. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La interfaz web estará disponible en: **`http://localhost:5173/`**

---

## 👥 Sistema de Roles y Permisos (RBAC)

La plataforma cuenta con 3 roles predefinidos según los requerimientos del proyecto:

| Rol | Alcance y Permisos |
|---|---|
| **Administrador del Sistema** | Acceso total. Puede ver, crear, editar y eliminar cualquier usuario. **Único rol autorizado para cambiar o asignar roles** en la plataforma. |
| **Miembro Comité Científico** | Puede consultar usuarios, crear nuevos miembros y autores, y eliminar usuarios. Autorizado para deshabilitar artículos y emitir avales en etapas posteriores. |
| **Autor** | Rol por defecto para cualquier usuario registrado. Puede consultar el directorio de usuarios y **editar sus propios datos personales**. No puede crear ni eliminar otros usuarios ni alterar roles. |

### Blindaje de seguridad en creación:
- Cualquier registro público o petición no autenticada asigna forzosamente el rol **Autor**.
- Solo peticiones autenticadas con rol `Administrador del Sistema` pueden especificar roles diferentes al crear usuarios.

---

## 🔐 Seguridad y Flujo de Autenticación

1. **Autenticación con JWT (JSON Web Tokens):**
   - El inicio de sesión emite un token de acceso `access_token` (duración 8 horas) y un `refresh_token` (7 días).
   - El cliente Axios en React (`userApi.js`) incluye automáticamente la cabecera `Authorization: Bearer <token>` en todas las peticiones a la API mediante un interceptor.
2. **Verificación con CAPTCHA en el Login:**
   - La pantalla de login incluye un reto gráfico SVG firmado criptográficamente por Django (`/api/v1/captcha/`) con vigencia de 5 minutos.
   - El backend valida el CAPTCHA antes de contrastar las credenciales para evitar ataques de fuerza bruta.
   - Incluye botón para refrescar el código si resulta difícil de leer.
3. **Recuperación de contraseña en dos pasos (`/forgot-password`):**
   - **Paso 1:** Solicitud ingresando el correo; el sistema genera un PIN criptográfico de 6 dígitos con vigencia de 15 minutos enviado vía SMTP.
   - **Paso 2:** Validación del PIN y actualización de la nueva contraseña con hashing seguro.
4. **Mi Perfil (`/profile`):**
   - Cada usuario puede acceder desde la esquina superior derecha a su perfil para actualizar su nombre, apellido, teléfono e institución.
5. **Cierre de sesión seguro:**
   - Ubicado en el encabezado superior con cuadro de diálogo de confirmación antes de destruir la sesión y los tokens.

---

## 📱 Acceso desde celular en la misma red Wi-Fi

Para probar la plataforma en un dispositivo móvil conectado a la misma red local:

1. **Backend:** Ejecuta Django escuchando en todas las interfaces de red:
   ```powershell
   python manage.py runserver 0.0.0.0:8000
   ```
2. **Frontend:** Ejecuta Vite con la bandera `--host`:
   ```bash
   npm run dev -- --host
   ```
3. **En el celular:** Abre el navegador en la IP local mostrada en la terminal (ejemplo: `http://192.168.40.4:5173`). La conexión a la API se adapta dinámicamente sin requerir configuraciones manuales.

---

## 🔌 API Endpoints principales

La API REST del backend responde bajo el prefijo `/api/v1/`:

| Módulo | Endpoint | Método | Descripción | Permisos |
|---|---|---|---|---|
| **Autenticación** | `/api/v1/login/` | `POST` | Inicia sesión con usuario/correo, password y CAPTCHA | Público |
| **Seguridad** | `/api/v1/captcha/` | `GET` | Genera un reto visual CAPTCHA firmado | Público |
| **Recuperación PIN** | `/api/v1/password-reset/request/` | `POST` | Solicita envío de PIN de 6 dígitos al correo | Público |
| **Confirmación PIN** | `/api/v1/password-reset/confirm/` | `POST` | Valida PIN y actualiza la contraseña del usuario | Público |
| **Usuarios** | `/api/v1/users/` | `GET` | Listado con filtros (`?role=` y `?search=`) | Autenticado |
| **Usuarios** | `/api/v1/users/` | `POST` | Creación de usuario (rol forzado a Autor si no es Admin) | Abierto / Admin |
| **Detalle Usuario** | `/api/v1/users/{id}/` | `GET` | Consulta detallada de usuario | Autenticado |
| **Edición Usuario** | `/api/v1/users/{id}/` | `PATCH`, `PUT` | Edición de datos (propio usuario o Admin/Comité). Cambio de rol exclusivo de Admin | Autenticado |
| **Eliminación** | `/api/v1/users/{id}/` | `DELETE` | Eliminar usuario | Admin o Comité |
| **Roles** | `/api/v1/roles/` | `GET` | Consulta el listado de roles | Autenticado |
| **Admin Django** | `/admin/` | Web | Panel administrativo nativo de Django | Superusuario |

---

## 🛠️ Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| Redirección inmediata a `/login` | Comportamiento normal de seguridad | Inicia sesión con tus credenciales o crea una cuenta en `/register`. |
| `No se pudieron cargar los usuarios` o error `401 Unauthorized` | El token JWT expiró tras 8 horas de inactividad o el backend está apagado | Haz clic en **Salir** en el encabezado superior y vuelve a iniciar sesión; verifica que Django esté corriendo en el puerto 8000. |
| `El código CAPTCHA es incorrecto o ha expirado` | El CAPTCHA superó los 5 minutos o se escribió mal | Haz clic en el botón circular de recarga junto al CAPTCHA para generar un código nuevo. |
| `OperationalError: could not translate host name...` | Error de conexión a internet o host incorrecto | Verifica que `DB_HOST` en `.env` sea el de Supabase y tengas conexión a internet. |
| `SMTPAuthenticationError` al recuperar clave | Clave de correo inválida en `.env` | En Gmail debes usar una Contraseña de Aplicación de 16 caracteres, no tu contraseña normal. |
| `KeyError: 'SECRET_KEY'` o `KeyError: 'DB_NAME'` | Falta el archivo `.env` o variables | Asegúrate de tener el archivo `.env` configurado con base en `.env.example`. |
| `Scripts deshabilitados` en PowerShell | Política de ejecución de Windows | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell. |
