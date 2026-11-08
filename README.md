# SciConf

Sistema web para la gestión de conferencias científicas (**SciConf**), que incluye gestión de roles, usuarios, comités y ponencias.

---

## 📋 Requisitos previos

Asegúrate de contar con lo siguiente instalado en tu equipo:

- **Python 3.10 o superior** (se recomienda 3.12 o 3.13)
- **Node.js 18+ LTS y npm**
- **Git**
- Cuenta o base de datos en **PostgreSQL / Supabase**

---

## 📁 Estructura del proyecto

```text
SciConf/
├── crud/                # Configuración principal de Django (settings, urls, wsgi, asgi)
├── users/               # Aplicación Django de usuarios, autenticación y roles
├── frontend/            # Aplicación Frontend desarrollada con React, Vite y TailwindCSS
├── manage.py            # Comando CLI para gestión de Django
├── requirements.txt     # Dependencias de Python
├── .env.example         # Plantilla de variables de entorno
└── .env                 # Variables de entorno locales (NO subir a Git)
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

Edita el archivo `.env` con las variables correspondientes a tu proyecto y base de datos (PostgreSQL / Supabase):

```ini
SECRET_KEY=clave-secreta-de-django
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=postgres
DB_USER=postgres.xxxxxxxxxxxxxxxxxxxx
DB_PASSWORD=tu_password_de_base_de_datos
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432
```

> **Generar una SECRET_KEY:** Puedes generar una ejecutando:
> ```powershell
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

#### D. Ejecutar migraciones en la base de datos

Aplica la estructura de datos en tu base de datos:
```bash
python manage.py migrate
```

#### E. Crear usuario Administrador (Superuser)

Crea un usuario para acceder al panel administrativo y autenticarte en la plataforma:
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

## 🔌 API Endpoints principales

La API REST del backend responde bajo el prefijo `/api/v1/`:

| Módulo | Endpoint | Descripción |
|---|---|---|
| **Usuarios** | `/api/v1/users/` | CRUD de usuarios |
| **Roles** | `/api/v1/roles/` | Listado y consulta de roles |
| **Admin Django** | `/admin/` | Panel administrativo nativo de Django |

---

## 🖥️ Tecnologías utilizadas

- **Backend:** Python 3, Django, Django REST Framework, `psycopg2-binary`.
- **Base de Datos:** PostgreSQL / Supabase.
- **Frontend:** React 19, Vite, TailwindCSS v4, React Router DOM, Axios, Lucide / Heroicons.
- **Control de Versiones:** Git & GitHub.

---

## 🛠️ Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| `OperationalError: could not translate host name...` | Error de conexión a internet o host incorrecto de base de datos | Revisa que el `DB_HOST` en tu `.env` sea el exacto de Supabase y tengas conexión a internet. |
| `KeyError: 'SECRET_KEY'` o `KeyError: 'DB_NAME'` | El archivo `.env` no existe o le faltan variables | Verifica que el archivo se llame exactamente `.env` y contenga todas las variables del `.env.example`. |
| `¡Error de conexión con el backend!` en el frontend | El backend no está corriendo | Asegúrate de haber iniciado el servidor con `python manage.py runserver` en la terminal del backend. |
| `Scripts deshabilitados` en PowerShell | Política de ejecución de Windows | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell y vuelve a activar el `venv`. |
