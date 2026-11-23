"""
Pruebas E2E con Selenium para SciConf — HU: Deshabilitar Artículo.

Requisitos previos:
  1. .\venv\Scripts\pip install selenium
  2. Backend corriendo:  .\venv\Scripts\python.exe manage.py runserver
  3. Frontend corriendo: npm --prefix frontend run dev

Variables de entorno (PowerShell):
  $env:SELENIUM_COMMITTEE_USER="comite@correo.com"
  $env:SELENIUM_COMMITTEE_PASSWORD="Password123!"
  $env:SELENIUM_ADMIN_USER="admin@correo.com"
  $env:SELENIUM_ADMIN_PASSWORD="Password123!"
  # Opcional: título exacto o parcial del artículo de prueba a deshabilitar
  $env:SELENIUM_ARTICLE_TITLE="Mi articulo de prueba"

Ejecución:
  .\venv\Scripts\python.exe -m unittest tests_selenium/test_e2e_sciconf.py -v
"""

import os
import unittest
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = os.getenv("SELENIUM_BASE_URL", "http://localhost:5173")
COMMITTEE_USER = os.getenv("SELENIUM_COMMITTEE_USER", os.getenv("SELENIUM_USER", "comite@sciconf.com"))
COMMITTEE_PASSWORD = os.getenv("SELENIUM_COMMITTEE_PASSWORD", os.getenv("SELENIUM_PASSWORD", "Password123!"))
ADMIN_USER = os.getenv("SELENIUM_ADMIN_USER", "admin@sciconf.com")
ADMIN_PASSWORD = os.getenv("SELENIUM_ADMIN_PASSWORD", "Password123!")
ARTICLE_TITLE = os.getenv("SELENIUM_ARTICLE_TITLE", "")
HEADLESS = os.getenv("SELENIUM_HEADLESS", "false").lower() == "true"


class SciConfDisableArticleE2ETests(unittest.TestCase):
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
        self.wait = WebDriverWait(self.driver, 10)

    def tearDown(self):
        self.driver.quit()

    def login(self, identifier, password, role=""):
        self.driver.get(f"{BASE_URL}/login")

        email_input = self.wait.until(EC.visibility_of_element_located((By.ID, "email")))
        email_input.clear()
        email_input.send_keys(identifier)

        pass_input = self.driver.find_element(By.ID, "password")
        pass_input.clear()
        pass_input.send_keys(password)

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

        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Bienvenido a SciConf')]"))
        )

    def logout(self):
        logout_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Cerrar sesión']"))
        )
        logout_btn.click()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/login"))

    def test_01_solo_comite_puede_deshabilitar_admin_no_ve_boton(self):
        """HU Deshabilitar Artículo (Permisos): El Administrador NO debe ver el botón Deshabilitar."""
        self.login(ADMIN_USER, ADMIN_PASSWORD, role="Administrador del Sistema")
        self.driver.get(f"{BASE_URL}/articles")

        self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Gestión de Artículos')]"))
        )
        # Esperar a que termine de cargar la tabla
        self.wait.until(
            EC.invisibility_of_element_located((By.XPATH, "//td[contains(text(), 'Cargando artículos...')]"))
        )

        disable_buttons = self.driver.find_elements(
            By.XPATH, "//button[contains(., 'Deshabilitar')]"
        )
        self.assertEqual(
            len(disable_buttons),
            0,
            "El Administrador no debería ver botones para deshabilitar artículos.",
        )

    def test_02_comite_deshabilita_articulo_con_confirmacion_y_desaparece(self):
        """
        HU Deshabilitar Artículo (Flujo completo):
        1. Miembro del Comité busca/selecciona un artículo.
        2. Ingresa el motivo de deshabilitación.
        3. Confirma en la ventana de ConfirmActionModal (acción irreversible).
        4. El artículo desaparece de los listados (/articles y /versions) y no puede rehabilitarse.
        """
        self.login(COMMITTEE_USER, COMMITTEE_PASSWORD, role="Miembro Comité Científico")
        self.driver.get(f"{BASE_URL}/articles")

        self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Gestión de Artículos')]"))
        )
        self.wait.until(
            EC.invisibility_of_element_located((By.XPATH, "//td[contains(text(), 'Cargando artículos...')]"))
        )

        # Si se definió SELENIUM_ARTICLE_TITLE, filtrar por título
        if ARTICLE_TITLE:
            search_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder='Buscar título...']")
            search_input.clear()
            search_input.send_keys(ARTICLE_TITLE)
            self.wait.until(
                EC.visibility_of_element_located((By.XPATH, f"//tbody//tr[contains(., '{ARTICLE_TITLE}')]"))
            )

        first_row = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//tbody/tr[1]"))
        )
        target_title = first_row.find_element(By.CSS_SELECTOR, "td:first-child p").text.strip()

        # Clic en el botón Deshabilitar de la fila
        disable_btn = self.wait.until(
            EC.element_to_be_clickable(
                first_row.find_element(By.XPATH, ".//button[contains(., 'Deshabilitar')]")
            )
        )
        disable_btn.click()

        # Esperar al modal DisableArticleModal y su campo de motivo obligatorio
        reason_box = self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h3[contains(., 'Deshabilitar Artículo')]/ancestor::div[contains(@class, 'max-w-md')]//textarea")
            )
        )
        submit_disable_btn = self.driver.find_element(
            By.XPATH, "//button[@type='submit' and contains(., 'Deshabilitar Artículo')]"
        )

        # Validar que sin motivo no avanza al modal de confirmación
        reason_box.clear()
        submit_disable_btn.click()
        confirm_dialogs = self.driver.find_elements(
            By.XPATH, "//button[normalize-space()='Sí, deshabilitar artículo']"
        )
        self.assertEqual(len(confirm_dialogs), 0, "No debe permitir deshabilitar sin ingresar un motivo.")

        # Ingresar motivo y enviar para abrir ConfirmActionModal
        reason_box.send_keys("Prueba automatizada Selenium: artículo fuera de alcance temático.")
        submit_disable_btn.click()

        # Confirmar en ConfirmActionModal (variante danger, acción irreversible)
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'esta acción no se puede deshacer')]")
            )
        )
        confirm_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Sí, deshabilitar artículo']"))
        )
        confirm_btn.click()

        # Verificar que el modal se cierra y el artículo desaparece al buscarlo en /articles
        self.wait.until(
            EC.invisibility_of_element_located((By.XPATH, "//button[normalize-space()='Sí, deshabilitar artículo']"))
        )
        search_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder='Buscar título...']")
        search_input.clear()
        search_input.send_keys(target_title)

        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//td[contains(text(), 'No se encontraron artículos con los criterios seleccionados.')]")
            )
        )

        # Verificar también que ya no hay ningún botón "Habilitar" en la tabla
        enable_buttons = self.driver.find_elements(By.XPATH, "//button[contains(., 'Habilitar')]")
        self.assertEqual(len(enable_buttons), 0)


if __name__ == "__main__":
    unittest.main()
