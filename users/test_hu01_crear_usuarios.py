"""
Pruebas de la HU-01: Crear usuarios.
Responsable: Rodrigo Berrío.

Criterios de aceptación (HU-01 tarea 4):
- Un correo repetido es rechazado.
- Un autor que intenta crear usuarios recibe acceso denegado.
- Creación correcta.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import Role

User = get_user_model()

URL_USUARIOS = '/api/v1/users/'


class CrearUsuarioTests(APITestCase):

    def setUp(self):
        # Escenario: los roles y un usuario de cada tipo.
        self.rol_admin, _ = Role.objects.get_or_create(name='Administrador del Sistema')
        self.rol_autor, _ = Role.objects.get_or_create(name='Autor')

        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com',
            password='AdminPass123!', role=self.rol_admin,
        )
        self.autor = User.objects.create_user(
            username='autor1', email='autor1@test.com',
            password='AutorPass123!', role=self.rol_autor,
        )

        # Datos de un usuario nuevo válido, para reutilizar en las pruebas.
        self.datos_nuevo = {
            'username': 'nuevo1',
            'email': 'nuevo1@test.com',
            'password': 'NuevoPass123!',
            'first_name': 'Ana',
            'last_name': 'Gómez',
        }

    # Criterio 1: un correo repetido es rechazado
    def test_correo_repetido_es_rechazado(self):
        # 1. Preparar: el admin inicia sesión, y los datos de Ana
        #pero con el correo del autor que ya existe
        self.client.force_authenticate(user=self.admin)
        datos = {**self.datos_nuevo, 'email': 'autor1@test.com'}
    
        # 2. Ejecutar: intenta crear el usuario
        respuesta = self.client.post(URL_USUARIOS, datos, format='json')
    
        # 3. Verificar: responde 400 (rechazado) y no se duplicó el correo
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email='autor1@test.com').count(), 1)

    # Criterio 2: un autor que intenta crear usuarios recibe acceso denegado
    def test_autor_no_puede_crear_usuarios(self):
        # 1. Preparar: inicia sesión el AUTOR (no tiene permiso de crear)
        self.client.force_authenticate(user=self.autor)

        # 2. Ejecutar: intenta crear a Ana con datos correctos
        respuesta = self.client.post(URL_USUARIOS, self.datos_nuevo, format='json')

        # 3. Verificar: responde 403 (prohibido) y Ana NO quedó creada
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email='nuevo1@test.com').exists())

    # Criterio 3: creación correcta
    def test_admin_crea_usuario_correctamente(self):
        # 1. Preparar: el administrador inicia sesión
        self.client.force_authenticate(user=self.admin)

        # 2. Ejecutar: envía el formulario de crear usuario
        respuesta = self.client.post(URL_USUARIOS, self.datos_nuevo, format='json')

        # 3. Verificar: respondió 201 (creado) y Ana quedó guardada
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='nuevo1@test.com').exists())


    