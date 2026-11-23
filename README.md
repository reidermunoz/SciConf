# SciConf

Sistema web para la gestión integral de conferencias científicas (**SciConf**), que incluye autenticación de usuarios basada en roles (RBAC), tokens JWT con renovación automática, verificación CAPTCHA, gestión de comités y autores, postulación de artículos por línea temática, control de versiones en PDF, evaluación por pares (3 jurados), emisión de avales y agenda del evento.

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
├── users/                     # App Django: usuarios, roles, JWT, CAPTCHA y recuperación con PIN
│   ├── migrations/            # Historial de migraciones (incluye 0004_seed_roles)
│   ├── models.py              # Modelos: User, Role, PasswordResetCode
│   ├── permissions.py         # Clases de permisos DRF por rol (IsAdminUser, IsAdminOrCommittee)
│   ├── serializers.py         # Serializadores DRF con blindaje de roles y actualización de perfil
│   ├── tests.py               # Pruebas automatizadas de actualización de datos, roles y JWT
│   ├── urls.py                # Rutas de auth, refresh token, captcha, reset, users y roles
│   └── views.py               # Controladores de login, captcha, usuarios, roles y recuperación
├── articles/                  # App Django: artículos, versiones en PDF, revisiones y fechas límite
│   ├── migrations/            # Migraciones del módulo de artículos y revisiones
│   ├── models.py              # Modelos: Article, ArticleVersion, ArticleReview, ConferenceDeadline
│   ├── serializers.py         # Serializadores de artículos, versiones, evaluaciones y fechas
│   ├── urls.py                # Rutas de artículos, revisiones y fechas límite
│   └── views.py               # Lógica de negocio: filtros, subida PDF, asignación de 3 jurados y avales
├── media/                     # Archivos PDF subidos (versiones de artículos y cesión de copyright)
├── frontend/                  # Frontend en React 19 + Vite + TailwindCSS
│   ├── public/                # Favicon e imágenes públicas estáticas (SciConfLogo.png)
│   ├── src/
│   │   ├── api/               # Cliente Axios centralizado con auto-refresh JWT
│   │   │   ├── client.js      # Instancia Axios e interceptores de petición y renovación 401
│   │   │   ├── userApi.js     # Endpoints de autenticación, usuarios, roles y recuperación
│   │   │   └── articleApi.js  # Endpoints de artículos, versiones PDF, revisiones y fechas límite
│   │   ├── assets/            # Logos e imágenes del sistema (SciConfWhiteCut.png)
│   │   ├── components/
│   │   │   ├── articles/      # Modales: ArticleModal, ArticleDetailModal, DisableArticleModal, UploadVersionModal, ReviewModal
│   │   │   ├── common/        # Componentes compartidos (PasswordInput, ComingSoon)
│   │   │   ├── layout/        # AppLayout, Header, Sidebar e íconos
│   │   │   └── users/         # UserCreateForm y UsersList (con modal de edición)
│   │   ├── hooks/             # Hook de autenticación y permisos reactivo (useAuth.js)
│   │   ├── pages/
│   │   │   ├── articles/      # Articles.jsx (gestión y filtros) y Versions.jsx (versiones y revisiones)
│   │   │   ├── auth/          # LoginForm.jsx, RegisterForm.jsx, ForgotPassword.jsx
│   │   │   ├── users/         # Users.jsx, CreateUser.jsx, Profile.jsx (edición total de perfil)
│   │   │   └── Home.jsx       # Inicio tipo Dashboard unificado del sistema
│   │   ├── routes/            # Configuración de rutas públicas y privadas (RoutesProjects.jsx)
│   │   └── schemas/           # Esquemas de validación con Zod (userSchema.js)
├── manage.py                  # CLI de gestión de Django
├── tests_selenium/            # Pruebas E2E automatizadas con Selenium
│   └── test_e2e_sciconf.py    # Suite de pruebas E2E (ej. HU Deshabilitar Artículo)
├── requirements.txt           # Dependencias de Python (Django, DRF, SimpleJWT, psycopg2, dotenv, selenium)
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
ALLOWED_HOSTS=127.0.0.1,localhost,*

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

Aplica los modelos de usuarios, roles, artículos, versiones y revisiones:
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
| **Administrador del Sistema** | Acceso total. Puede ver, crear, editar y eliminar cualquier usuario; **único rol autorizado para cambiar o asignar roles**. Puede gestionar artículos, asignar evaluadores de forma individual o masiva y administrar todo el flujo de la conferencia. |
| **Miembro Comité Científico** | Puede consultar usuarios, crear nuevos miembros/autores, editar y eliminar usuarios. Autorizado para **habilitar/deshabilitar artículos**, realizar **evaluaciones de artículos asignados** y emitir **avales de presentación y publicación**. |
| **Autor** | Rol por defecto para cualquier usuario registrado. Puede consultar directorios, **actualizar todos sus datos personales**, **proponer y editar sus propios artículos** y **subir versiones en PDF** (propuesta inicial, versión corregida y versión final con cesión de copyright). |

---

## ✨ Avances y Módulos Implementados

### 1. 🔐 Autenticación, Seguridad y Renovación Automática JWT
- **JWT con Auto-Refresh transparente (`client.js`):**
  - El inicio de sesión emite un `access_token` (8 horas) y un `refresh_token` rotativo (7 días).
  - Si el `access_token` vence mientras el usuario utiliza la aplicación, el interceptor de Axios captura el error `401`, pausa las peticiones concurrentes en una cola (`failedQueue`), solicita un nuevo token a `/api/v1/token/refresh/` y reintenta las llamadas automáticamente sin interrumpir al usuario.
  - Si el `refresh_token` también ha expirado, limpia la sesión y redirige limpiamente a `/login`.
- **CAPTCHA visual en Login (`/api/v1/captcha/`):**
  - Reto gráfico SVG firmado criptográficamente con `TimestampSigner` (vigencia de 5 minutos) y botón de recarga.
- **Visibilidad de contraseña (`PasswordInput`):**
  - Botón para mostrar/ocultar contraseñas en formularios de acceso, registro y perfil.
- **Recuperación de contraseña en dos pasos (`/forgot-password`):**
  - Envío de PIN de 6 dígitos al correo (válido por 15 minutos) y restablecimiento seguro de clave.

### 2. 👤 Gestión de Usuarios y Edición Completa de Perfil
- **Mi Perfil (`/profile`):**
  - Permite a cualquier usuario actualizar **todos sus datos personales**: nombre de usuario (`username`), correo electrónico (`email`), nombre (`first_name`), apellidos (`last_name`), teléfono (`phone`), institución/afiliación (`institution`) y **cambiar su contraseña** de forma opcional.
  - Sincronización reactiva mediante eventos (`auth-user-updated`) que actualiza inmediatamente el nombre e iniciales en el encabezado superior (`Header.jsx`) sin recargar la página.
- **Directorio de Usuarios (`/users`):**
  - Búsqueda en tiempo real por nombre, usuario o correo, y filtro por rol.
  - Modal de edición de usuarios para Administradores y Comité Científico, cambio directo de rol (exclusivo para Admin) y eliminación con confirmación.

### 3. 📄 Módulo de Artículos (`/articles`)
- **Postulación y Edición:**
  - Los autores y administradores pueden registrar y modificar ponencias indicando título, resumen y una de las **5 líneas temáticas oficiales**:
    1. *Sistemas Inteligentes*
    2. *Tecnologias en informática*
    3. *Educación en informática*
    4. *Sistemas de software*
    5. *Software en la práctica*
- **Filtros combinados en Backend:**
  - Búsqueda por título, filtro por línea temática y filtro por estado de habilitación (Habilitados / Deshabilitados).
- **Habilitación / Deshabilitación para la Conferencia:**
  - Los miembros del Comité Científico y Administradores pueden deshabilitar o reactivar artículos registrando el motivo de la decisión (`DisableArticleModal.jsx`).
- **Detalle completo (`ArticleDetailModal.jsx`):**
  - Consulta de metadatos, autor, línea temática, estado actual, historial de versiones en PDF y evaluaciones.

### 4. 📑 Módulo de Versiones, Revisiones y Avales (`/versions`)
- **Entrega de Versiones en PDF (`UploadVersionModal.jsx`):**
  - **Propuesta Inicial (`INICIAL`):** Subida del documento PDF inicial para revisión.
  - **Versión Corregida (`CORREGIDA`):** Disponible cuando el artículo ha sido **Aceptado**, incorporando las mejoras sugeridas por los jurados.
  - **Versión Final (`FINAL`):** Disponible tras obtener el aval de presentación; exige adjuntar tanto el PDF final del artículo como el PDF de **cesión de copyright**.
- **Asignación de Evaluadores (3 Jurados):**
  - Asignación aleatoria de **3 miembros del Comité Científico** (distintos al autor) por artículo, de forma individual o masiva para todos los artículos postulados.
- **Evaluación por Pares y Regla de Mayoría (`ReviewModal.jsx`):**
  - Cada uno de los 3 evaluadores registra sus comentarios de retroalimentación y emite su concepto (*Aprobado* / *Rechazado*).
  - Al completarse las 3 revisiones, el sistema calcula automáticamente el veredicto: **Aceptado** (2 o 3 votos a favor) o **Rechazado** (menos de 2 votos a favor).
- **Avales de Presentación y Publicación:**
  - Los jurados asignados revisan las versiones corregida y final para otorgar el **Aval para Presentación** (`CON_AVAL_PRESENTACION`) y el **Aval para Publicación** (`CON_AVAL_PUBLICACION`).

### 5. 🎨 Mejoras de Interfaz y Experiencia (UI/UX)
- **Inicio tipo Dashboard unificado (`/`):** Página principal consolidada con acceso directo a los módulos y resumen del flujo de etapas de la conferencia.
- **Botón de Actualizar con animación:** Presente en la cabecera de **Usuarios**, **Artículos** y **Versiones y Revisiones** con ícono giratorio (`animate-spin`) para refrescar los cambios desde la base de datos en cualquier momento.
- **Notificaciones (`react-hot-toast`):** Alertas de confirmación y error ubicadas en la **esquina inferior derecha** (`bottom-right`) para no obstruir los controles superiores.

---

## 🧪 Ejecución de pruebas automatizadas

El proyecto está configurado para ejecutar pruebas unitarias en una base de datos SQLite en memoria (sin afectar ni requerir conexión a Supabase):

```powershell
.\venv\Scripts\python.exe manage.py test
```
*(Para correr solo un módulo: `.\venv\Scripts\python.exe manage.py test users` o `articles`)*

---

## 🧪 Pruebas E2E con Selenium (Guía paso a paso para el equipo)

El proyecto cuenta con pruebas automatizadas de navegador en `tests_selenium/test_e2e_sciconf.py` usando **Selenium 4** (no requiere descargar `chromedriver.exe` manualmente, Selenium Manager lo gestiona automáticamente si tienes **Google Chrome** instalado).

### Paso 1: Instalar dependencias y aplicar migraciones
Con el entorno virtual activado:
```powershell
pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py migrate
```

### Paso 2: Habilitar el bypass de CAPTCHA para pruebas locales
1. En el archivo `.env` de la raíz, asegúrate de tener:
   ```env
   DEBUG=True
   BYPASS_CAPTCHA=True
   ```
2. En `frontend/.env`, asegúrate de tener:
   ```env
   VITE_BYPASS_CAPTCHA=true
   ```
*(En producción ambos deben ir en `False` / `false` para exigir CAPTCHA real).*

### Paso 3: Levantar Backend y Frontend
Abre dos terminales en la raíz del proyecto:
- **Terminal 1 (Django API):**
  ```powershell
  .\venv\Scripts\python.exe manage.py runserver
  ```
- **Terminal 2 (React / Vite):**
  ```powershell
  npm --prefix frontend run dev
  ```

### Paso 4: Configurar credenciales y ejecutar Selenium
En una **tercera terminal** (PowerShell), define las variables de entorno con usuarios reales de tu base de datos y ejecuta la suite:
```powershell
$env:SELENIUM_ADMIN_USER="correo_admin@sciconf.com"
$env:SELENIUM_ADMIN_PASSWORD="tu_password_admin"
$env:SELENIUM_COMMITTEE_USER="correo_comite@sciconf.com"
$env:SELENIUM_COMMITTEE_PASSWORD="tu_password_comite"
# Opcional: título exacto o parcial del artículo de prueba que deseas deshabilitar
$env:SELENIUM_ARTICLE_TITLE="Mi articulo de prueba"
# Opcional: ejecutar sin abrir ventana del navegador
# $env:SELENIUM_HEADLESS="true"

.\venv\Scripts\python.exe -m unittest tests_selenium/test_e2e_sciconf.py -v
```

### ¿Qué validan estas pruebas?
- `test_01_solo_comite_puede_deshabilitar_admin_no_ve_boton`: Verifica que el rol Administrador no visualiza el botón `Deshabilitar` en `/articles`.
- `test_02_comite_deshabilita_articulo_con_confirmacion_y_desaparece`: Inicia sesión como Miembro del Comité Científico, valida que el motivo sea obligatorio, confirma la acción irreversible en `ConfirmActionModal` y comprueba que el artículo desaparece de los listados sin opción de rehabilitarse.
- *(Nota: si el usuario tiene múltiples roles, la prueba selecciona automáticamente el rol correspondiente en el modal de inicio de sesión).*

---

## 📱 Acceso desde celular en la misma red Wi-Fi

Para probar la plataforma en un dispositivo móvil conectado a la misma red Wi-Fi que el computador:

1. **Conocer tu IP local (IPv4):**
   Ejecuta `ipconfig` en PowerShell y ubica tu **Dirección IPv4** (ej. `192.168.1.15`).
2. **Backend (Terminal 1):** Ejecuta Django escuchando en todas las interfaces de red:
   ```powershell
   .\venv\Scripts\python manage.py runserver 0.0.0.0:8000
   ```
3. **Frontend (Terminal 2):** Ejecuta Vite con la bandera `--host`:
   ```powershell
   cd frontend
   npm run dev -- --host
   ```
4. **En el celular:** Abre el navegador e ingresa la dirección `Network` que muestra Vite (ejemplo: `http://192.168.1.15:5173`). El cliente Axios detecta automáticamente el host y redirige las peticiones al puerto `8000`.

---

## 🔌 API Endpoints principales

La API REST del backend responde bajo el prefijo `/api/v1/`:

| Módulo | Endpoint | Método | Descripción | Permisos |
|---|---|---|---|---|
| **Auth** | `/api/v1/login/` | `POST` | Inicia sesión con usuario/correo, contraseña y CAPTCHA | Público |
| **Auth** | `/api/v1/token/refresh/` | `POST` | Renueva el `access_token` usando el `refresh_token` | Público |
| **Seguridad** | `/api/v1/captcha/` | `GET` | Genera un reto visual CAPTCHA en SVG firmado | Público |
| **Recuperación** | `/api/v1/password-reset/request/` | `POST` | Solicita envío de PIN de 6 dígitos al correo | Público |
| **Confirmación** | `/api/v1/password-reset/confirm/` | `POST` | Valida PIN y actualiza la contraseña | Público |
| **Usuarios** | `/api/v1/users/` | `GET`, `POST` | Listado con filtros (`?role=`, `?search=`) y registro | Autenticado / Abierto |
| **Usuario** | `/api/v1/users/{id}/` | `GET`, `PATCH`, `DELETE` | Detalle, edición de datos personales/rol y eliminación | Autenticado / Admin |
| **Roles** | `/api/v1/roles/` | `GET` | Listado de roles del sistema | Autenticado |
| **Artículos** | `/api/v1/articles/` | `GET`, `POST` | Listado con filtros (`?thematic_line=`, `?is_active=`, `?search=`) y creación | Autenticado / Autor |
| **Artículo** | `/api/v1/articles/{id}/` | `GET`, `PATCH` | Detalle y modificación de artículo | Autor dueño / Admin |
| **Habilitación** | `/api/v1/articles/{id}/disable/` | `POST` | Habilitar o deshabilitar artículo para la conferencia | Comité / Admin |
| **Versiones PDF** | `/api/v1/articles/{id}/upload-version/` | `POST` | Subida de PDF (inicial, corregida o final + copyright) | Autor dueño / Admin |
| **Evaluadores** | `/api/v1/articles/{id}/assign-evaluators/` | `POST` | Asigna 3 evaluadores del comité a un artículo | Comité / Admin |
| **Evaluadores** | `/api/v1/articles/assign-all-evaluators/` | `POST` | Asignación masiva de 3 jurados a artículos postulados | Admin |
| **Revisiones** | `/api/v1/reviews/` | `GET` | Consulta las revisiones asignadas al jurado actual | Comité / Admin |
| **Evaluar** | `/api/v1/reviews/{id}/submit-evaluation/` | `POST` | Registra comentarios y voto de aprobación/rechazo | Jurado asignado |
| **Avales** | `/api/v1/reviews/{id}/endorse-presentation/` | `POST` | Otorga aval para presentación en la conferencia | Jurado asignado |
| **Avales** | `/api/v1/reviews/{id}/endorse-publication/` | `POST` | Otorga aval final para publicación | Jurado asignado |
| **Fechas límite** | `/api/v1/deadlines/` | `GET`, `POST` | Consulta y configuración de fechas límite globales | Autenticado / Admin |

---

## 🛠️ Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| Redirección a `/login` | Comportamiento normal cuando no hay sesión o el `refresh_token` venció tras 7 días | Inicia sesión nuevamente con tus credenciales. |
| `El código CAPTCHA es incorrecto o ha expirado` | El CAPTCHA superó los 5 minutos o se escribió mal | Haz clic en el botón circular de recarga junto al CAPTCHA para generar uno nuevo. |
| `OperationalError: could not translate host name...` | Sin conexión a internet o `DB_HOST` incorrecto | Verifica que `DB_HOST` en `.env` sea el de Supabase y tengas acceso a internet. |
| `SMTPAuthenticationError` al recuperar clave | Credenciales de correo inválidas en `.env` | En Gmail debes usar una Contraseña de Aplicación de 16 caracteres, o usar el backend de consola en desarrollo. |
| No carga en el celular con la IP de red | El Firewall de Windows bloquea el puerto `8000` o `5173` | Asegúrate de correr Django con `0.0.0.0:8000`, Vite con `--host` y permitir Python/Node en redes privadas del Firewall. |
| `Scripts deshabilitados` en PowerShell | Política de ejecución de Windows | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell. |
