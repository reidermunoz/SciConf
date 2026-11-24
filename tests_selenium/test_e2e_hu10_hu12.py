"""
Pruebas E2E con Selenium para SciConf — HU-10 (Crear artículo) y HU-12 (Detalle del artículo).

Requisitos previos:
  1. Backend corriendo:  ./venv/Scripts/python.exe manage.py runserver
  2. Frontend corriendo: npm --prefix frontend run dev
  3. Google Chrome instalado (Selenium Manager gestiona chromedriver)

Variables de entorno (PowerShell):
  # Autor (opcional). Si las defines, la suite inicia sesión con TU cuenta
  # y no crea usuarios. Si no, reutiliza o registra el usuario de prueba E2E.
  $env:SELENIUM_AUTHOR_USER="autor@correo.com"
  $env:SELENIUM_AUTHOR_PASSWORD="Password123!"
  # Opcional: permiso (el Administrador no debe ver "Proponer artículo")
  $env:SELENIUM_ADMIN_USER="admin@correo.com"
  $env:SELENIUM_ADMIN_PASSWORD="Password123!"
  # Opcional: ejecutar sin abrir ventana del navegador
  # $env:SELENIUM_HEADLESS="true"

Ejecución:
  ./venv/Scripts/python.exe -m unittest tests_selenium/test_e2e_hu10_hu12.py -v
"""

from __future__ import annotations

import json
import os
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


BASE_URL = os.getenv("SELENIUM_BASE_URL", "http://localhost:5173").rstrip("/")
API_URL = os.getenv("SELENIUM_API_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
HEADLESS = os.getenv("SELENIUM_HEADLESS", "false").lower() == "true"

# Usuario de prueba que esta suite puede crear en la BD compartida (se reporta al final).
DEFAULT_AUTHOR_EMAIL = "e2e.hu10.autor@sciconf.test"
DEFAULT_AUTHOR_USERNAME = "e2e_hu10_autor"
DEFAULT_AUTHOR_PASSWORD = "E2E-SciConf-Hu10!"
DEFAULT_AUTHOR_FIRST = "E2E"
DEFAULT_AUTHOR_LAST = "AutorHU10"
DEFAULT_AUTHOR_INSTITUTION = "Universidad del Valle - Pruebas E2E"

AUTHOR_USER = os.getenv("SELENIUM_AUTHOR_USER", DEFAULT_AUTHOR_EMAIL)
AUTHOR_PASSWORD = os.getenv("SELENIUM_AUTHOR_PASSWORD", DEFAULT_AUTHOR_PASSWORD)
ADMIN_USER = os.getenv("SELENIUM_ADMIN_USER", "")
ADMIN_PASSWORD = os.getenv("SELENIUM_ADMIN_PASSWORD", "")

PDF_PATH = str(Path(__file__).resolve().parent / "fixtures" / "e2e_articulo.pdf")
THEMATIC_LINE = "Educación en informática"
KEYWORDS = "E2E, Selenium, HU-10"
ABSTRACT = "Resumen E2E de prueba Selenium para HU-10 y HU-12. No usar en la conferencia real."
COAUTHOR = {
    "first_name": "Ana",
    "last_name": "PruebaE2E",
    "email": "ana.e2e@sciconf.test",
    "university": "Universidad del Valle",
}


def _is_pool_exhausted(payload):
    text = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    return "EMAXCONNSESSION" in text or "max clients reached" in text


def _api_request(method, path, data=None, token=None, timeout=20, retries=8):
    url = f"{API_URL}/{path.lstrip('/')}"
    last_status, last_payload = None, None
    for attempt in range(1, retries + 1):
        headers = {"Accept": "application/json"}
        body = None
        if data is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(data).encode("utf-8")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8") or "{}"
                return resp.status, json.loads(raw)
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                payload = {"error": "pool_exhausted"} if _is_pool_exhausted(raw) else {"raw": raw[:500]}
            last_status, last_payload = exc.code, payload
            if _is_pool_exhausted(raw) and attempt < retries:
                time.sleep(8)
                continue
            return exc.code, payload
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_status, last_payload = 0, {"error": str(exc)}
            if attempt < retries:
                time.sleep(8)
                continue
            return 0, last_payload
    return last_status, last_payload


def _captcha_code_from_key(captcha_key):
    # TimestampSigner.sign(code) -> "CODE:timestamp:signature"
    return (captcha_key or "").split(":", 1)[0]


def api_login(identifier, password):
    # El CAPTCHA no usa la BD; el login sí. Si el pool de Supabase está lleno
    # (EMAXCONNSESSION), esperamos a que se libere un cupo.
    last_err = ""
    for attempt in range(1, 11):
        status, captcha = _api_request("GET", "captcha/", retries=3)
        if status != 200 or not captcha.get("captcha_key"):
            last_err = f"No se pudo obtener el CAPTCHA (HTTP {status}): {captcha}"
            time.sleep(8)
            continue
        status, payload = _api_request(
            "POST",
            "login/",
            {
                "email": identifier,
                "password": password,
                "captcha_key": captcha["captcha_key"],
                "captcha_input": _captcha_code_from_key(captcha["captcha_key"]),
            },
            retries=2,
        )
        if status == 200 and payload.get("access"):
            return payload, None
        last_err = f"Login API falló (HTTP {status}): {payload}"
        if _is_pool_exhausted(payload) or status == 500:
            time.sleep(12)
            continue
        return None, last_err
    return None, last_err


def _profile_from_user(user):
    """Nombre e institución reales del usuario, tomados de la respuesta de login."""
    user = user or {}
    return {
        "first_name": (user.get("first_name") or "").strip(),
        "last_name": (user.get("last_name") or "").strip(),
        "institution": (user.get("institution") or "").strip(),
    }


def _author_payload(email, password, session, *, created, provided, note, fallback_user=None):
    user = (session or {}).get("user") or fallback_user or {}
    profile = _profile_from_user(user)
    return {
        "email": email,
        "password": password,
        "created": created,
        "provided": provided,
        "user": user,
        "note": note,
        **profile,
    }


def provision_author():
    """
    Si existen SELENIUM_AUTHOR_USER y SELENIUM_AUTHOR_PASSWORD, solo inicia
    sesión con esa cuenta (no registra usuarios).
    Si no, intenta el usuario E2E por defecto; si no existe, lo registra
    como Autor (registro público) y lo reporta.
    """
    provided = bool(os.getenv("SELENIUM_AUTHOR_USER"))
    email = AUTHOR_USER
    password = AUTHOR_PASSWORD

    if provided and not os.getenv("SELENIUM_AUTHOR_PASSWORD"):
        raise RuntimeError(
            "Definiste SELENIUM_AUTHOR_USER pero falta SELENIUM_AUTHOR_PASSWORD."
        )

    session, err = api_login(email, password)
    if session:
        note = (
            "Login con la cuenta indicada en SELENIUM_AUTHOR_USER."
            if provided
            else "Usuario autor existente (login OK)."
        )
        return _author_payload(
            email, password, session, created=False, provided=provided, note=note
        )

    # Con cuenta propia nunca se crea un usuario nuevo: o entra, o falla claro.
    if provided:
        raise RuntimeError(
            f"No se pudo iniciar sesión con SELENIUM_AUTHOR_USER={email!r}. "
            f"Revisa el correo, la contraseña y que la cuenta esté activa. Detalle: {err}"
        )

    status, payload = _api_request(
        "POST",
        "users/",
        {
            "username": DEFAULT_AUTHOR_USERNAME,
            "email": DEFAULT_AUTHOR_EMAIL,
            "password": DEFAULT_AUTHOR_PASSWORD,
            "first_name": DEFAULT_AUTHOR_FIRST,
            "last_name": DEFAULT_AUTHOR_LAST,
            "institution": DEFAULT_AUTHOR_INSTITUTION,
        },
    )
    if status in (200, 201):
        created = True
        note = (
            f"Se creó el usuario de prueba {DEFAULT_AUTHOR_EMAIL} "
            f"(username={DEFAULT_AUTHOR_USERNAME}, rol Autor) en la BD compartida."
        )
        session, err = api_login(DEFAULT_AUTHOR_EMAIL, DEFAULT_AUTHOR_PASSWORD)
        if not session:
            raise RuntimeError(f"Usuario creado pero el login falló: {err}")
        return _author_payload(
            DEFAULT_AUTHOR_EMAIL,
            DEFAULT_AUTHOR_PASSWORD,
            session,
            created=created,
            provided=False,
            note=note,
            fallback_user=payload,
        )

    # Email o username ya existen, pero la contraseña no coincidió: crear uno único.
    suffix = datetime.now().strftime("%Y%m%d%H%M%S")
    email = f"e2e.hu10.autor.{suffix}@sciconf.test"
    username = f"e2e_hu10_autor_{suffix}"
    status, payload = _api_request(
        "POST",
        "users/",
        {
            "username": username,
            "email": email,
            "password": DEFAULT_AUTHOR_PASSWORD,
            "first_name": DEFAULT_AUTHOR_FIRST,
            "last_name": DEFAULT_AUTHOR_LAST,
            "institution": DEFAULT_AUTHOR_INSTITUTION,
        },
    )
    if status not in (200, 201):
        raise RuntimeError(
            f"No se pudo registrar un autor de prueba (HTTP {status}): {payload}. "
            f"Login previo del usuario por defecto falló: {err}"
        )
    session, login_err = api_login(email, DEFAULT_AUTHOR_PASSWORD)
    if not session:
        raise RuntimeError(f"Usuario {email} creado pero el login falló: {login_err}")
    return _author_payload(
        email,
        DEFAULT_AUTHOR_PASSWORD,
        session,
        created=True,
        provided=False,
        note=(
            f"El usuario por defecto no estaba disponible. Se creó {email} "
            f"(username={username}, rol Autor) en la BD compartida."
        ),
        fallback_user=payload,
    )


class SciConfCreateAndDetailArticleE2ETests(unittest.TestCase):
    author_info = None
    author_first_name = ""
    author_last_name = ""
    author_institution = ""
    created_article_title = None
    created_articles = []

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if not Path(PDF_PATH).is_file():
            raise RuntimeError(f"No se encontró el PDF de prueba: {PDF_PATH}")
        cls.author_info = provision_author()
        cls.author_first_name = (cls.author_info.get("first_name") or "").strip()
        cls.author_last_name = (cls.author_info.get("last_name") or "").strip()
        cls.author_institution = (cls.author_info.get("institution") or "").strip()
        print(f"\n[E2E] Autor: {cls.author_info['email']} — {cls.author_info['note']}")

    def setUp(self):
        # Abre un Google Chrome controlado por Selenium antes de cada prueba.
        options = Options()
        if HEADLESS:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1366,900")
        options.add_argument("--disable-features=PasswordLeakDetection")
        options.add_argument("--disable-save-password-bubble")
        options.add_experimental_option(
            "prefs",
            {
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False,
                "profile.password_manager_leak_detection": False,
            },
        )
        # webdriver.Chrome: Selenium Manager baja el chromedriver si hace falta.
        self.driver = webdriver.Chrome(options=options)
        # WebDriverWait: espera hasta 15s a que un elemento exista o sea visible.
        self.wait = WebDriverWait(self.driver, 15)

    def tearDown(self):
        # Cierra el navegador al terminar cada prueba, haya pasado o fallado.
        self.driver.quit()

    def login(self, identifier, password, role=""):
        # Intenta el login por el formulario (como el test del equipo).
        # Si el navegador falla (CAPTCHA mal leído o error 500 de Supabase),
        # entra por la API y deja los tokens en localStorage, igual que el front.
        # Un solo intento por formulario: si el pool está lleno, reintentar
        # en el navegador solo agota más conexiones y retrasa el fallback.
        last_detail = ""
        if self._login_via_form(identifier, password, role):
            return
        last_detail = self._login_error_text() or self.driver.current_url

        session, err = api_login(identifier, password)
        if not session:
            self.fail(
                f"No se pudo iniciar sesión como {identifier}. "
                f"Formulario: {last_detail}. API: {err}"
            )
        self._inject_session(session, role)

    def _login_via_form(self, identifier, password, role=""):
        self.driver.get(f"{BASE_URL}/login")

        email_input = self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        email_input.clear()
        email_input.send_keys(identifier)

        pass_input = self.driver.find_element(By.ID, "password")
        pass_input.clear()
        pass_input.send_keys(password)

        if not self._fill_captcha_if_needed():
            return False
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Si el usuario tiene más de 1 rol, selecciona el rol solicitado en el modal
        try:
            modal_title = WebDriverWait(self.driver, 3).until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//h2[contains(text(), 'Selecciona tu rol para iniciar')]")
                )
            )
            if modal_title:
                if role:
                    role_option = self.driver.find_element(
                        By.XPATH, f"//label[.//span[normalize-space()='{role}']]"
                    )
                else:
                    role_option = self.driver.find_element(
                        By.CSS_SELECTOR, "input[name='active_role']"
                    )
                role_option.click()
                self.driver.find_element(
                    By.XPATH, "//button[@type='submit' and normalize-space()='Ingresar']"
                ).click()
        except TimeoutException:
            pass

        try:
            self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
            self.wait.until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//h2[contains(text(), 'Bienvenido a SciConf')]")
                )
            )
            return True
        except TimeoutException:
            return False

    def _login_error_text(self):
        err = self.driver.find_elements(
            By.XPATH,
            "//*[contains(text(), 'CAPTCHA') or contains(text(), 'Credenciales') or contains(text(), 'iniciar sesión') or contains(text(), 'deshabilitada')]",
        )
        return err[0].text.strip() if err else ""

    def _inject_session(self, session, role=""):
        # Misma forma en que LoginForm guarda la sesión: access_token, refresh_token y user.
        user = dict(session.get("user") or {})
        roles = user.get("roles") or []
        if role and role in roles:
            chosen = role
        else:
            chosen = roles[0] if roles else None
        user["active_role"] = chosen

        self.driver.get(f"{BASE_URL}/login")
        self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        self.driver.execute_script(
            """
            localStorage.setItem('access_token', arguments[0]);
            localStorage.setItem('refresh_token', arguments[1]);
            localStorage.setItem('user', arguments[2]);
            """,
            session["access"],
            session["refresh"],
            json.dumps(user),
        )
        self.driver.get(f"{BASE_URL}/")
        try:
            self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
            self.wait.until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//h2[contains(text(), 'Bienvenido a SciConf')]")
                )
            )
        except TimeoutException:
            self.fail(
                f"Se inyectó la sesión por API, pero no cargó el inicio. URL={self.driver.current_url}"
            )

    def _fill_captcha_if_needed(self):
        # No activamos BYPASS_CAPTCHA. Si el front ya puso 5 caracteres, se respetan.
        # El código se lee del textContent del SVG (sin espacios) y se escribe
        # disparando el evento input, para que React actualice el estado.
        try:
            captcha_input = WebDriverWait(self.driver, 5).until(
                EC.visibility_of_element_located((By.ID, "captcha_input"))
            )
        except TimeoutException:
            return True

        current = "".join((captcha_input.get_attribute("value") or "").split())
        if len(current) == 5:
            return True

        WebDriverWait(self.driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.overflow-hidden svg text"))
        )
        code = self.driver.execute_script(
            """
            const el = document.querySelector('div.overflow-hidden svg text');
            return el ? (el.textContent || '') : '';
            """
        )
        code = "".join((code or "").split()).upper()
        if len(code) != 5:
            return False

        self.driver.execute_script(
            """
            const input = arguments[0];
            const value = arguments[1];
            const proto = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            );
            proto.set.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            """,
            captcha_input,
            code,
        )
        return True

    def open_articles(self):
        self.driver.get(f"{BASE_URL}/articles")
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h2[contains(text(), 'Gestión de Artículos')]")
            )
        )
        self.wait.until(
            EC.invisibility_of_element_located(
                (By.XPATH, "//td[contains(text(), 'Cargando artículos...')]")
            )
        )

    def propose_buttons(self):
        return self.driver.find_elements(
            By.XPATH, "//button[contains(normalize-space(), 'Proponer artículo')]"
        )

    def open_create_modal(self):
        buttons = self.propose_buttons()
        self.assertTrue(buttons, "El Autor debería ver el botón '+ Proponer artículo'.")
        btn = buttons[0]
        self.assertTrue(
            btn.is_enabled(),
            "El botón 'Proponer artículo' está deshabilitado (el plazo de postulaciones pudo haber vencido).",
        )
        btn.click()
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h3[contains(text(), 'Proponer Nuevo Artículo')]")
            )
        )

    def fill_article_form(self, title, include_pdf=True, include_coauthor=True, use_spaces_only=False):
        title_input = self.driver.find_element(
            By.XPATH, "//label[contains(., 'Título del Artículo')]/following-sibling::input"
        )
        keywords_input = self.driver.find_element(
            By.CSS_SELECTOR, "input[placeholder='Ej. IA, Microservicios, Cloud']"
        )
        abstract_input = self.driver.find_element(
            By.CSS_SELECTOR,
            "textarea[placeholder='Describe los objetivos, metodología, resultados y conclusiones del artículo...']",
        )
        thematic = Select(
            self.driver.find_element(
                By.XPATH, "//label[contains(., 'Línea Temática')]/following-sibling::select"
            )
        )

        value = "     " if use_spaces_only else title
        title_input.clear()
        title_input.send_keys(value)
        if not use_spaces_only:
            thematic.select_by_visible_text(THEMATIC_LINE)
        keywords_input.clear()
        keywords_input.send_keys("     " if use_spaces_only else KEYWORDS)
        abstract_input.clear()
        abstract_input.send_keys("     " if use_spaces_only else ABSTRACT)

        if include_pdf:
            file_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
            file_input.send_keys(PDF_PATH)

        if include_coauthor and not use_spaces_only:
            self.driver.find_element(
                By.XPATH, "//button[contains(normalize-space(), 'Agregar coautor')]"
            ).click()
            self.driver.find_element(By.CSS_SELECTOR, "input[placeholder='Nombre *']").send_keys(
                COAUTHOR["first_name"]
            )
            self.driver.find_element(By.CSS_SELECTOR, "input[placeholder='Apellido *']").send_keys(
                COAUTHOR["last_name"]
            )
            self.driver.find_element(
                By.CSS_SELECTOR, "input[placeholder='Correo electrónico *']"
            ).send_keys(COAUTHOR["email"])
            self.driver.find_element(
                By.CSS_SELECTOR, "input[placeholder='Universidad de afiliación *']"
            ).send_keys(COAUTHOR["university"])

    def submit_create_form(self):
        # El botón queda abajo en un modal con scroll; se centra y se pulsa
        # también por JS por si otro elemento intercepta el clic.
        btn = self.wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[@type='submit' and contains(., 'Proponer Artículo')]")
            )
        )
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
        try:
            self.wait.until(EC.element_to_be_clickable(btn)).click()
        except Exception:
            self.driver.execute_script("arguments[0].click();", btn)

    def toast_with_text(self, text, timeout=5):
        # contains(., ...) recorre todo el texto del nodo; contains(text(), ...)
        # falla si react-hot-toast parte el mensaje en varios nodos.
        xpath = f"//*[contains(., \"{text}\")]"
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.XPATH, xpath))
            )
        except TimeoutException:
            return None

    def _error_toast_texts(self):
        texts = []
        for el in self.driver.find_elements(
            By.CSS_SELECTOR, "[role='status'], [role='alert']"
        ):
            t = (el.text or "").strip()
            if t:
                texts.append(t)
        return texts

    def _save_failure_artifacts(self, label):
        # Carpeta local, no se sube a git: tests_selenium/artifacts
        out = Path(__file__).resolve().parent / "artifacts"
        out.mkdir(exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        shot = out / f"{label}_{stamp}.png"
        log = out / f"{label}_{stamp}.txt"
        try:
            self.driver.save_screenshot(str(shot))
        except Exception as exc:
            shot = f"(no se pudo guardar captura: {exc})"
        body = ""
        try:
            body = self.driver.find_element(By.TAG_NAME, "body").text
        except Exception:
            body = "(sin texto)"
        content = (
            f"URL: {self.driver.current_url}\n"
            f"Toasts: {self._error_toast_texts()!r}\n\n"
            f"{body}\n"
        )
        log.write_text(content, encoding="utf-8")
        print(f"\n[E2E] Artefactos del fallo: {shot} y {log}")

    def _article_exists_via_api(self, title):
        # Último recurso, solo para confirmar si el POST sí llegó al servidor.
        info = self.author_info or {}
        session, err = api_login(info.get("email"), info.get("password"))
        if not session:
            print(f"\n[E2E] Fallback API: no se pudo iniciar sesión. {err}")
            return False
        q = urllib.parse.quote(title)
        status, payload = _api_request(
            "GET", f"articles/?search={q}", token=session.get("access"), retries=4
        )
        if status != 200:
            print(f"\n[E2E] Fallback API: GET /articles/ falló (HTTP {status}): {payload}")
            return False
        arts = payload if isinstance(payload, list) else (payload.get("results") or [])
        found = any((a.get("title") or "") == title for a in arts)
        print(
            f"\n[E2E] Fallback API: el artículo {'SÍ' if found else 'NO'} "
            f"existe en el servidor ({title})."
        )
        return found

    def wait_for_article_created(self, title, timeout=30):
        """Éxito si aparece el toast o el artículo ya está en la tabla.
        Si sale un toast de error de servidor, devuelve 'error' para reintentar.
        """
        toast_xp = "//*[contains(., 'Artículo propuesto exitosamente')]"
        row_xp = f"//tbody//tr[contains(., '{title}')]"
        err_xp = (
            "//*[contains(., 'Ocurrió un error al guardar') or "
            "contains(., 'error al guardar el artículo') or "
            "contains(., 'El plazo de postulación')]"
        )

        def _created(driver):
            if driver.find_elements(By.XPATH, toast_xp):
                return "toast"
            if driver.find_elements(By.XPATH, row_xp):
                return "tabla"
            if driver.find_elements(By.XPATH, err_xp):
                return "error"
            return False

        try:
            how = WebDriverWait(self.driver, timeout).until(_created)
            if how == "tabla":
                print(
                    f"\n[E2E] Aviso: no se detectó el toast, pero el artículo "
                    f"sí apareció en la tabla: {title}"
                )
            return how
        except TimeoutException:
            return None

    def confirm_article_created(self, title, timeout=30):
        """Envío + reintento si el servidor falla, búsqueda en tabla y fallback API."""
        how = self.wait_for_article_created(title, timeout=timeout)
        if how == "error":
            print("\n[E2E] El servidor devolvió un error al guardar; se reintenta el envío una vez.")
            time.sleep(8)
            self.submit_create_form()
            how = self.wait_for_article_created(title, timeout=timeout)
            if how == "error":
                how = None

        try:
            WebDriverWait(self.driver, 8).until(
                EC.invisibility_of_element_located(
                    (By.XPATH, "//h3[contains(., 'Proponer Nuevo Artículo')]")
                )
            )
        except TimeoutException:
            pass

        if how in (None, "toast"):
            try:
                search_input = self.driver.find_element(
                    By.CSS_SELECTOR, "input[placeholder='Buscar título...']"
                )
                search_input.clear()
                search_input.send_keys(title)
                WebDriverWait(self.driver, 12).until(
                    EC.visibility_of_element_located(
                        (By.XPATH, f"//tbody//tr[contains(., '{title}')]")
                    )
                )
                if how is None:
                    how = "tabla-busqueda"
                    print(
                        f"\n[E2E] Aviso: el artículo apareció al buscarlo en la tabla: {title}"
                    )
            except (TimeoutException, Exception):
                pass

        if how is None and self._article_exists_via_api(title):
            how = "api"
            print(
                f"\n[E2E] Aviso: la UI no lo mostró, pero la API confirma el artículo: {title}"
            )

        if how is None:
            self._save_failure_artifacts("create_article")
        return how

    def search_article(self, title):
        search_input = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder='Buscar título...']"))
        )
        search_input.clear()
        search_input.send_keys(title)
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//tbody//tr[contains(., '{title}')]"))
        )

    @unittest.skipUnless(
        ADMIN_USER and ADMIN_PASSWORD,
        "Define SELENIUM_ADMIN_USER y SELENIUM_ADMIN_PASSWORD para validar permisos del Administrador.",
    )
    def test_01_admin_no_ve_boton_proponer_articulo(self):
        """HU-10 (Permisos): el Administrador no debe ver el botón de proponer artículo."""
        # Paso 1: login como Administrador (solo si hay credenciales).
        # Paso 2: ir a /articles.
        # Paso 3: comprobar que NO aparece "+ Proponer artículo".
        self.login(ADMIN_USER, ADMIN_PASSWORD, role="Administrador del Sistema")
        self.open_articles()
        self.assertEqual(
            len(self.propose_buttons()),
            0,
            "El Administrador no debería ver el botón '+ Proponer artículo'.",
        )

    def test_02_autor_ve_boton_y_validacion_campos_obligatorios(self):
        """
        HU-10 (Validación):
        1. El Autor ve el botón '+ Proponer artículo'.
        2. Sin PDF, el navegador bloquea el envío (campo requerido).
        3. Con PDF pero título/palabras clave/resumen en blanco, aparece el toast de obligatoriedad.
        """
        # Paso 1: login como Autor y abrir "Proponer artículo".
        # Paso 2: llenar texto pero sin PDF → el navegador bloquea el envío.
        # Paso 3: enviar título/keywords/resumen vacíos (solo espacios) con PDF.
        info = self.author_info
        self.login(info["email"], info["password"], role="Autor")
        self.open_articles()
        self.open_create_modal()

        self.fill_article_form("Temporal", include_pdf=False, include_coauthor=False)
        self.submit_create_form()

        file_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
        valid = self.driver.execute_script("return arguments[0].validity.valid;", file_input)
        self.assertFalse(valid, "El PDF inicial es obligatorio y el formulario no debería ser válido sin él.")
        self.assertTrue(
            self.driver.find_elements(By.XPATH, "//h3[contains(text(), 'Proponer Nuevo Artículo')]"),
            "El modal de creación debe permanecer abierto si falta el PDF.",
        )

        self.fill_article_form("Temporal", include_pdf=True, include_coauthor=False, use_spaces_only=True)
        self.submit_create_form()
        toast = self.toast_with_text("Título, palabras clave y resumen son obligatorios.", timeout=8)
        self.assertIsNotNone(
            toast,
            "Debe mostrarse el mensaje de campos obligatorios cuando título/keywords/resumen van vacíos.",
        )

    def test_03_autor_crea_articulo_con_pdf(self):
        """
        HU-10 (Flujo completo): el Autor propone un artículo con PDF inicial y coautor,
        ve el mensaje de éxito y el artículo aparece en el listado.
        """
        # Paso 1: login como Autor y abrir el modal de creación.
        # Paso 2: llenar título [E2E], temática, keywords, resumen, coautor y PDF.
        # Paso 3: esperar el toast de éxito y buscar el título en la tabla.
        info = self.author_info
        title = f"[E2E] HU-10 postulacion {datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.login(info["email"], info["password"], role="Autor")
        self.open_articles()
        self.open_create_modal()
        self.fill_article_form(title, include_pdf=True, include_coauthor=True)
        self.submit_create_form()

        how = self.confirm_article_created(title, timeout=30)
        self.assertIsNotNone(
            how,
            "No se confirmó la creación: no apareció el toast, ni el artículo en la tabla, ni en la API.",
        )

        row = self.search_article(title)
        self.assertIn(title, row.text)
        self.assertIn(THEMATIC_LINE, row.text)

        SciConfCreateAndDetailArticleE2ETests.created_article_title = title
        SciConfCreateAndDetailArticleE2ETests.created_articles.append(title)
        print(f"\n[E2E] Artículo creado en la BD: {title}")

    def test_04_detalle_muestra_datos_del_articulo(self):
        """
        HU-12 (Detalle): al pulsar 'Ver', el modal muestra título, línea temática,
        estado, resumen, palabras clave, autor, coautor y el PDF inicial.
        """
        # Paso 1: login como Autor (crea el artículo si el test 03 no corrió).
        # Paso 2: buscar el artículo [E2E] y pulsar "Ver".
        # Paso 3: comprobar título, temática, POSTULADO, resumen, autor, coautor y PDF.
        info = self.author_info
        title = self.created_article_title
        self.login(info["email"], info["password"], role="Autor")
        self.open_articles()

        if not title:
            title = f"[E2E] HU-12 detalle {datetime.now().strftime('%Y%m%d-%H%M%S')}"
            self.open_create_modal()
            self.fill_article_form(title, include_pdf=True, include_coauthor=True)
            self.submit_create_form()
            how = self.confirm_article_created(title, timeout=30)
            self.assertIsNotNone(how, "No se pudo crear un artículo previo para ver el detalle.")
            SciConfCreateAndDetailArticleE2ETests.created_article_title = title
            SciConfCreateAndDetailArticleE2ETests.created_articles.append(title)
            print(f"\n[E2E] Artículo creado en la BD (para detalle): {title}")

        row = self.search_article(title)
        row.find_element(By.XPATH, ".//button[contains(., 'Ver')]").click()

        heading = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//h3[normalize-space()='{title}']"))
        )
        modal = heading.find_element(By.XPATH, "./ancestor::div[contains(@class, 'max-w-2xl')]")
        text = modal.text

        self.assertIn(THEMATIC_LINE, text)
        self.assertIn("POSTULADO", text)
        self.assertIn(ABSTRACT, text)
        self.assertIn("E2E", text)
        self.assertIn("Selenium", text)
        self.assertIn("HU-10", text)
        self.assertIn("Autor principal", text)
        if self.author_first_name:
            self.assertIn(self.author_first_name, text)
        if self.author_last_name:
            self.assertIn(self.author_last_name, text)
        self.assertIn(info["email"], text)
        # La institución solo se exige si el usuario la tiene registrada.
        if self.author_institution:
            self.assertIn(self.author_institution, text)
        self.assertIn("Ana PruebaE2E", text)
        self.assertIn(COAUTHOR["email"], text)
        self.assertIn(COAUTHOR["university"], text)
        self.assertIn("Propuesta inicial", text)
        self.assertTrue(
            modal.find_elements(By.XPATH, ".//a[contains(., 'Ver / Descargar PDF')]"),
            "El detalle debe incluir el enlace para ver/descargar el PDF inicial.",
        )


if __name__ == "__main__":
    unittest.main()
