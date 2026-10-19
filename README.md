# Scientific Conference Manager

Aplicación web para la gestión de datos de una conferencia científica.

## 📋 Requisitos previos

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas:

- **Python 3.10 o superior**
- **Node.js (versión LTS)**
- **Git**
- Acceso a las credenciales de Supabase del proyecto

## 📁 Estructura del proyecto

```
scientific-conference-manager/
├── backend/             # Configuración de Django (settings, urls, wsgi)
├── frontend/            # Aplicación React con Vite
├── manage.py            # Comandos de Django
├── requirements.txt     # Dependencias de Python
├── .env.example         # Plantilla de variables de entorno
└── .env                 # Tus variables de entorno (NO se sube al repositorio)
```

> **Importante:** `manage.py`, `requirements.txt` y el archivo `.env` están en la **carpeta raíz** del proyecto.

## 🚀 Instalación y configuración

Sigue los pasos a continuación para ejecutar el proyecto en tu entorno local.

### 1. Clonar el repositorio

Abre una terminal y ejecuta los siguientes comandos:

```bash
git clone https://github.com/jaiver-qe/scientific-conference-manager.git
cd scientific-conference-manager
```

### 2. Crear y activar el entorno virtual de Python

Desde la carpeta raíz del proyecto, crea un entorno virtual para instalar las dependencias del backend.

**Windows (PowerShell):**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> Si PowerShell bloquea la activación por políticas de ejecución, corre una sola vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o usa la terminal `cmd` con `venv\Scripts\activate.bat`.

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

> **Nota:** Mantén el entorno virtual activado mientras trabajas con el backend.

### 3. Instalar las dependencias del backend

Con el entorno virtual activado y desde la **carpeta raíz**, ejecuta:

```bash
pip install -r requirements.txt
```

Este comando instalará las dependencias necesarias para el backend desarrollado con Django REST Framework.

### 4. Configurar las variables de entorno

1. En la **carpeta raíz** del proyecto (donde está `manage.py`), busca el archivo `.env.example`.
2. Crea una copia y nómbrala exactamente `.env` (con el punto al inicio y sin extensión adicional).
3. Abre el `.env` y configura las siguientes variables.

Ejemplo del contenido del `.env`:

```
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:TU_CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY='TU_CLAVE_SECRETA'
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a la base de datos de Supabase. Reemplaza `TU_CONTRASEÑA` por la credencial proporcionada por el grupo. Si es necesario, solicítala completa a través del canal privado del equipo. |
| `SECRET_KEY` | Clave con la que Django firma sesiones y tokens JWT. **Es obligatoria**: sin ella Django no arranca. Cada desarrollador debe generar la suya (ver abajo). |
| `DEBUG` | Usa `True` solo en desarrollo local. Si no se define, el valor por defecto es `False`. Nunca lo dejes en `True` en producción. |
| `ALLOWED_HOSTS` | Dominios desde los que se aceptan peticiones, separados por coma y sin espacios. Para desarrollo local: `127.0.0.1,localhost`. |

**Generar una `SECRET_KEY`:** con el entorno virtual activado, ejecuta:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copia el resultado en el `.env` entre **comillas simples**, porque la clave suele contener caracteres especiales (`#`, `$`, `%`) que se interpretarían mal sin ellas. No reutilices una clave que haya sido publicada o compartida en un chat.

**Ten en cuenta:**

- Cada línea debe tener el formato `NOMBRE=valor`, sin espacios alrededor del `=`. En `DATABASE_URL` no uses comillas.
- Si la contraseña contiene caracteres especiales (`@`, `#`, `/`, `:`, `%`), deben codificarse en formato URL (por ejemplo, `@` → `%40`, `#` → `%23`).
- En Windows, verifica que el archivo no quedó guardado como `.env.txt` (activa la opción "Extensiones de nombre de archivo" en el Explorador).
- Guarda el archivo con codificación **UTF-8**.
- Cada vez que modifiques el `.env`, reinicia el servidor de Django.

**Importante:** No compartas las credenciales ni subas el archivo `.env` al repositorio.


### 5. Ejecutar las migraciones de la base de datos

Desde la **carpeta raíz** del proyecto, ejecuta las migraciones para sincronizar la estructura de la base de datos:

```bash
python manage.py migrate
```

### 6. Crear un usuario administrador

Para poder iniciar sesión en la aplicación necesitas al menos un usuario. Créalo con:

```bash
python manage.py createsuperuser
```

Sigue las instrucciones en pantalla (nombre de usuario, correo y contraseña). Usarás ese usuario y contraseña en el formulario de inicio de sesión.

### 7. Iniciar el servidor del backend

Desde la **carpeta raíz**, ejecuta:

```bash
python manage.py runserver
```

El servidor de Django estará disponible en:

http://127.0.0.1:8000/

Deja esta terminal abierta mientras utilizas la aplicación.

### 8. Instalar las dependencias del frontend

Abre una **nueva terminal**, ubícate en la carpeta raíz del proyecto e ingresa a la carpeta del frontend:

```bash
cd frontend
```

Instala las dependencias de Node.js:

```bash
npm install
```

### 9. Iniciar el servidor del frontend

Desde la carpeta `frontend/`, ejecuta:

```bash
npm run dev
```

La aplicación web estará disponible en:

http://localhost:5173/

## 🖥️ Tecnologías utilizadas

- **Backend:** Python, Django y Django REST Framework
- **Autenticación:** JWT (djangorestframework-simplejwt)
- **Base de datos:** PostgreSQL en Supabase
- **Frontend:** React y Vite
- **Control de versiones:** Git

## 🔌 Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/login/` | Inicio de sesión. Recibe `username` y `password`, devuelve los tokens `access` y `refresh` |
| POST | `/api/token/refresh/` | Renueva el token de acceso a partir del token `refresh` |
| — | `/admin/` | Panel de administración de Django |

## ✅ Ejecución del proyecto

Para utilizar la aplicación, asegúrate de que ambos servidores estén funcionando:

| Componente | Carpeta | Comando | Dirección local |
|---|---|---|---|
| Backend | raíz del proyecto | `python manage.py runserver` | http://127.0.0.1:8000/ |
| Frontend | `frontend/` | `npm run dev` | http://localhost:5173/ |

**Importante:** Ejecuta cada servidor en su propia terminal. El entorno virtual de Python debe estar activado en la terminal del backend.

## 🛠️ Solución de problemas

| Error | Causa probable | Solución |
|---|---|---|
| `settings.DATABASES is improperly configured. Please supply the ENGINE value` | Django no está leyendo `DATABASE_URL` | Verifica que el archivo se llame `.env`, esté en la carpeta raíz, la línea empiece con `DATABASE_URL=` y reinicia el servidor |
| Error de autenticación o host no encontrado al conectar | Contraseña con caracteres especiales sin codificar | Codifica los caracteres en formato URL (`@` → `%40`) |
| `¡Error de conexión con el servidor backend!` en el login | El backend no está corriendo o hay un error de CORS | Verifica que `runserver` esté activo y que el frontend corra en `localhost:5173` |
| `ModuleNotFoundError` al iniciar Django | El entorno virtual no está activado o faltan dependencias | Activa el `venv` y ejecuta `pip install -r requirements.txt` |
