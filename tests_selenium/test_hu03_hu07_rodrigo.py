"""
Pruebas E2E con Selenium para SciConf — Rodrigo Berrío.
HU-03: Actualización de usuario (Administrador / Comité edita a otro usuario).
HU-07: Recuperación de contraseña por PIN.

Requisitos previos (ver README, sección "Pruebas E2E con Selenium"):
  1. pip install -r requirements.txt
  2. .env:           DEBUG=True y BYPASS_CAPTCHA=True
     frontend/.env:  VITE_BYPASS_CAPTCHA=true
  3. Backend:  .\\venv\\Scripts\\python.exe manage.py runserver
     Frontend: npm --prefix frontend run dev

Datos de prueba (crearlos una sola vez desde la app, como Administrador):
  - Usuario A (se edita):           prueba.hu03a@sciconf.com  (rol Autor)
  - Usuario B (dueño de un correo): prueba.hu03b@sciconf.com  (rol Autor)
  OJO: la base de datos es compartida (Supabase). Usar SOLO estos usuarios de prueba.

Variables de entorno (PowerShell):
  $env:SELENIUM_ADMIN_USER="correo_admin@sciconf.com"
  $env:SELENIUM_ADMIN_PASSWORD="tu_password_admin"
  $env:SELENIUM_HU03_TARGET_EMAIL="prueba.hu03a@sciconf.com"
  $env:SELENIUM_HU03_OTHER_EMAIL="prueba.hu03b@sciconf.com"
  $env:SELENIUM_HU07_EMAIL="prueba.hu03a@sciconf.com"   # correo existente para pedir el PIN

Ejecución:
  .\\venv\\Scripts\\python.exe -m unittest tests_selenium/test_hu03_hu07_rodrigo.py -v
"""

import os
import time
import unittest

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = os.getenv("SELENIUM_BASE_URL", "http://localhost:5173")
ADMIN_USER = os.getenv("SELENIUM_ADMIN_USER", "admin@sciconf.com")
ADMIN_PASSWORD = os.getenv("SELENIUM_ADMIN_PASSWORD", "Password123!")
TARGET_EMAIL = os.getenv("SELENIUM_HU03_TARGET_EMAIL", "prueba.hu03a@sciconf.com")
OTHER_EMAIL = os.getenv("SELENIUM_HU03_OTHER_EMAIL", "prueba.hu03b@sciconf.com")
HU07_EMAIL = os.getenv("SELENIUM_HU07_EMAIL", TARGET_EMAIL)
HEADLESS = os.getenv("SELENIUM_HEADLESS", "false").lower() == "true"
SCREENSHOTS_DIR = os.getenv("SELENIUM_SCREENSHOTS_DIR", "tests_selenium/capturas")


class BaseE2E(unittest.TestCase):
    def setUp(self):
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
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 15)

    def tearDown(self):
        # Captura de evidencia para el informe (sección 13)
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        self.driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, f"{self._testMethodName}.png"))
        self.driver.quit()

    def login(self, identifier, password, role=""):
        """Mismo login que tests_selenium/test_e2e_sciconf.py (CAPTCHA en modo bypass)."""
        self.driver.get(f"{BASE_URL}/login")
        email_input = self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        email_input.clear()
        email_input.send_keys(identifier)
        pass_input = self.driver.find_element(By.ID, "password")
        pass_input.clear()
        pass_input.send_keys(password)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Si el usuario tiene más de 1 rol, elegir el rol en el modal
        try:
            WebDriverWait(self.driver, 3).until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//h2[contains(text(), 'Selecciona tu rol para iniciar')]")
                )
            )
            if role:
                option = self.driver.find_element(By.XPATH, f"//label[.//span[normalize-space()='{role}']]")
            else:
                option = self.driver.find_element(By.CSS_SELECTOR, "input[name='active_role']")
            option.click()
            self.driver.find_element(
                By.XPATH, "//button[@type='submit' and normalize-space()='Ingresar']"
            ).click()
        except TimeoutException:
            pass

        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))


class HU03ActualizacionUsuarioE2E(BaseE2E):
    """HU-03: el Administrador edita los datos de otro usuario."""

    def abrir_edicion_de(self, email):
        self.driver.get(f"{BASE_URL}/users")
        buscador = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Buscar por nombre, usuario o correo...']")
            )
        )
        buscador.clear()
        buscador.send_keys(email)
        fila = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//tbody/tr[contains(., '{email}')]"))
        )
        fila.find_element(By.XPATH, ".//button[@aria-label='Editar usuario']").click()
        self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//h3[normalize-space()='Editar Usuario']"))
        )

    def campo(self, etiqueta):
        return self.driver.find_element(
            By.XPATH, f"//form//label[normalize-space()='{etiqueta}']/following-sibling::input"
        )

    def guardar(self):
        self.driver.find_element(
            By.XPATH, "//button[@type='submit' and normalize-space()='Guardar cambios']"
        ).click()

    def test_01_hu03_admin_edita_nombre_correctamente(self):
        """Caso positivo: el Administrador cambia el nombre y el sistema lo guarda."""
        self.login(ADMIN_USER, ADMIN_PASSWORD, role="Administrador del Sistema")
        self.abrir_edicion_de(TARGET_EMAIL)

        nuevo_nombre = f"Selenium{int(time.time()) % 100000}"
        nombre = self.campo("Nombre")
        nombre.clear()
        nombre.send_keys(nuevo_nombre)
        self.guardar()

        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'Usuario actualizado correctamente')]")
            )
        )
        fila = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//tbody/tr[contains(., '{TARGET_EMAIL}')]"))
        )
        self.assertIn(nuevo_nombre, fila.text, "La tabla debe mostrar el nombre actualizado.")

    def test_02_hu03_correo_repetido_es_rechazado(self):
        """Caso negativo: poner el correo de otro usuario debe ser rechazado."""
        self.login(ADMIN_USER, ADMIN_PASSWORD, role="Administrador del Sistema")
        self.abrir_edicion_de(TARGET_EMAIL)

        correo = self.campo("Correo Electrónico")
        correo.clear()
        correo.send_keys(OTHER_EMAIL)
        self.guardar()

        # El backend responde que el correo ya existe (mensaje en inglés o español)
        error = self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'already exists') or contains(text(), 'ya existe') "
                           "or contains(text(), 'Ya existe')]")
            )
        )
        self.assertTrue(error.is_displayed())
        # El modal sigue abierto: no se guardó el cambio
        self.assertTrue(
            self.driver.find_element(By.XPATH, "//h3[normalize-space()='Editar Usuario']").is_displayed()
        )


class HU07RecuperacionPinE2E(BaseE2E):
    """HU-07: recuperación de contraseña en 2 pasos (no requiere iniciar sesión)."""

    def mensaje_error(self):
        return self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.bg-red-50"))
        ).text

    def test_03_hu07_correo_inexistente_es_rechazado(self):
        """Caso negativo 1: pedir PIN para un correo que no existe."""
        self.driver.get(f"{BASE_URL}/forgot-password")
        correo = self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        correo.send_keys(f"no.existe.{int(time.time())}@sciconf.com")
        self.driver.find_element(By.XPATH, "//button[@type='submit']").click()

        self.assertIn("No existe un usuario con este correo", self.mensaje_error())
        # Sigue en el paso 1 (no aparece el campo del PIN)
        self.assertEqual(len(self.driver.find_elements(By.ID, "code")), 0)

    def test_04_hu07_pin_incorrecto_es_rechazado(self):
        """Caso negativo 2: con un correo real, un PIN inventado no permite cambiar la contraseña."""
        self.driver.get(f"{BASE_URL}/forgot-password")
        correo = self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        correo.send_keys(HU07_EMAIL)
        self.driver.find_element(By.XPATH, "//button[@type='submit']").click()

        # Paso 2: el sistema envió el PIN y muestra el formulario
        pin = self.wait.until(EC.visibility_of_element_located((By.ID, "code")))
        pin.send_keys("000000")
        self.driver.find_element(By.ID, "newPassword").send_keys("NuevaClave123!")
        self.driver.find_element(By.ID, "confirmPassword").send_keys("NuevaClave123!")
        self.driver.find_element(By.XPATH, "//button[@type='submit']").click()

        self.assertIn("El código es inválido o ya ha expirado", self.mensaje_error())
        # No redirige al login: la contraseña no se cambió
        self.assertIn("/forgot-password", self.driver.current_url)


if __name__ == "__main__":
    unittest.main()
