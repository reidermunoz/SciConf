# SciConf

Sistema web para la gestión integral de conferencias científicas (**SciConf**), que incluye autenticación de usuarios, gestión de comités, autores, ponencias y agenda del evento.

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
├── users/                     # App Django: usuarios, roles, autenticación y recuperación de PIN
│   ├── migrations/            # Historial de migraciones de base de datos
│   ├── models.py              # Modelos: User, Role, PasswordResetCode
│   ├── serializers.py         # Serializadores DRF
│   ├── urls.py                # Rutas de la API (login, reset, users, roles)
│   └── views.py               # Vistas y controladores de autenticación y usuarios
├── frontend/                  # Frontend en React 19 + Vite + TailwindCSS
│   ├── src/
│   │   ├── api/               # Conexión con Axios (userApi.js)
│   │   ├── components/        # Componentes reutilizables (layout, common, etc.)
│   │   ├── pages/
│   │   │   ├── auth/          # LoginForm.jsx, RegisterForm.jsx, ForgotPassword.jsx
│   │   │   ├── users/         # Vistas de gestión de usuarios
│   │   │   └── Home.jsx       # Pantalla principal del sistema
│   │   └── routes/            # Configuración de rutas y ProtectedRoute
├── manage.py                  # CLI de gestión de Django
├── requirements.txt           # Dependencias de Python
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

# Configuración de Correo Electrónico (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tucorreo@gmail.com
EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion_16_caracteres
DEFAULT_FROM_EMAIL=SciConf <tucorreo@gmail.com>
```

> 🔑 **Notas de configuración del `.env`:**
> 1. **`SECRET_KEY`:** Puedes generar una clave aleatoria ejecutando:
>    ```powershell
>    python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
>    ```
> 2. **`EMAIL_HOST_PASSWORD` (Gmail):** Requiere una **Contraseña de Aplicación** de 16 caracteres generada desde tu cuenta de Google (*Gestionar cuenta ➔ Seguridad ➔ Verificación en dos pasos ➔ Contraseñas de aplicaciones*). Escríbela continua sin espacios.

#### D. Ejecutar migraciones en la base de datos

Aplica los modelos en tu base de datos (usuarios, roles y códigos de recuperación):
```bash
python manage.py migrate
```

#### E. Crear usuario Administrador (Superuser)

Crea un superusuario para acceder al panel de Django y disponer de una cuenta de acceso inmediata:
```bash
python manage.py createsuperuser
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

## 🔐 Flujo de Autenticación y Acceso al Sistema

La aplicación cuenta con protección de rutas (`ProtectedRoute`), lo que garantiza que solo usuarios autenticados puedan ver el panel y los módulos:

1. **Pantalla inicial obligatoria (`/login`):**
   * Al abrir la aplicación en el navegador (`http://localhost:5173/`), el sistema verifica la sesión. Si no hay una sesión activa, redirige automáticamente a la pantalla de **Iniciar Sesión**.
   * Puedes autenticarte usando tu **correo electrónico o nombre de usuario** y contraseña.
2. **Registro de nuevos usuarios (`/register`):**
   * Si un miembro del equipo o autor aún no tiene cuenta, puede dar clic en *"Regístrate aquí"*.
   * El formulario valida en tiempo real datos obligatorios: Nombre, Apellido, Correo institucional/personal, Nombre de usuario, Contraseña, Confirmación de clave, Institución/Afiliación, Teléfono y Aceptación de política de tratamiento de datos.
3. **Recuperación de contraseña en dos pasos (`/forgot-password`):**
   * **Paso 1 (Solicitud web):** El usuario ingresa su correo y el sistema genera un PIN criptográfico de 6 dígitos con vigencia de 15 minutos, enviado de inmediato por correo electrónico.
   * **Paso 2 (Confirmación):** El usuario ingresa el PIN recibido y define su nueva contraseña, restableciendo su acceso al instante.
4. **Cierre de sesión:**
   * En la vista de inicio (`Home`) se incluye un botón para cerrar sesión y regresar al estado no autenticado.

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

| Módulo | Endpoint | Método | Descripción |
|---|---|---|---|
| **Autenticación** | `/api/v1/login/` | `POST` | Inicio de sesión con correo/usuario y contraseña |
| **Recuperación PIN** | `/api/v1/password-reset/request/` | `POST` | Solicita envío de PIN de 6 dígitos al correo |
| **Confirmación PIN** | `/api/v1/password-reset/confirm/` | `POST` | Valida PIN y actualiza la contraseña del usuario |
| **Usuarios** | `/api/v1/users/` | `GET`, `POST` | Listado y creación de usuarios |
| **Usuarios detalle** | `/api/v1/users/{id}/` | `GET`, `PUT`, `DELETE` | Detalle, actualización y eliminación de usuario |
| **Roles** | `/api/v1/roles/` | `GET`, `POST` | Consulta y gestión de roles |
| **Admin Django** | `/admin/` | Web | Panel administrativo nativo de Django |

---

## 🖥️ Tecnologías utilizadas

- **Backend:** Python 3, Django, Django REST Framework, `psycopg2-binary`, SMTP (Gmail / Google Workspace).
- **Base de Datos:** PostgreSQL / Supabase.
- **Frontend:** React 19, Vite, TailwindCSS, React Router DOM, React Hook Form, Zod, Axios.
- **Control de Versiones:** Git & GitHub.

---

## 🛠️ Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| Redirección inmediata a `/login` | Comportamiento normal por seguridad | Inicia sesión con tus credenciales o crea una cuenta en `/register`. |
| `OperationalError: could not translate host name...` | Error de conexión a internet o host incorrecto | Verifica que `DB_HOST` en `.env` sea el de Supabase y tengas conexión a internet. |
| `SMTPAuthenticationError` al recuperar clave | Clave de correo inválida en `.env` | En Gmail debes usar una Contraseña de Aplicación de 16 caracteres, no tu contraseña normal. |
| `KeyError: 'SECRET_KEY'` o `KeyError: 'DB_NAME'` | Falta el archivo `.env` o variables | Asegúrate de tener el archivo `.env` configurado con base en `.env.example`. |
| `¡Error de conexión con el backend!` en el frontend | El backend no está corriendo | Inicia el backend con `python manage.py runserver`. |
| `Scripts deshabilitados` en PowerShell | Política de ejecución de Windows | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell. |
