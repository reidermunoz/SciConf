from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import Role

User = get_user_model()

class UserUpdateTests(APITestCase):
    def setUp(self):
        self.role_author, _ = Role.objects.get_or_create(name='Autor')
        self.role_admin, _ = Role.objects.get_or_create(name='Administrador del Sistema')

        self.author = User.objects.create_user(
            username='autor1',
            email='autor1@test.com',
            password='Password123!',
            first_name='Juan',
            last_name='Perez',
            phone='123456789',
            institution='Universidad Test',
            role=self.role_author
        )

        self.admin = User.objects.create_user(
            username='admin1',
            email='admin1@test.com',
            password='AdminPassword123!',
            role=self.role_admin
        )

    def test_author_can_update_personal_data(self):
        self.client.force_authenticate(user=self.author)
        url = f'/api/v1/users/{self.author.id}/'
        payload = {
            'username': 'juan_actualizado',
            'email': 'juan_nuevo@test.com',
            'first_name': 'Juan Carlos',
            'last_name': 'Perez Gomez',
            'phone': '+57 300 999 8888',
            'institution': 'Universidad Nacional',
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.author.refresh_from_db()
        self.assertEqual(self.author.username, 'juan_actualizado')
        self.assertEqual(self.author.email, 'juan_nuevo@test.com')
        self.assertEqual(self.author.first_name, 'Juan Carlos')
        self.assertEqual(self.author.last_name, 'Perez Gomez')
        self.assertEqual(self.author.phone, '+57 300 999 8888')
        self.assertEqual(self.author.institution, 'Universidad Nacional')

    def test_author_can_change_password(self):
        self.client.force_authenticate(user=self.author)
        url = f'/api/v1/users/{self.author.id}/'
        payload = {
            'password': 'NewSecretPassword999!'
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.author.refresh_from_db()
        self.assertTrue(self.author.check_password('NewSecretPassword999!'))

    def test_author_cannot_change_role(self):
        self.client.force_authenticate(user=self.author)
        url = f'/api/v1/users/{self.author.id}/'
        payload = {
            'role': self.role_admin.id
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.author.refresh_from_db()
        self.assertEqual(self.author.role, self.role_author)

    def test_admin_can_change_role(self):
        self.client.force_authenticate(user=self.admin)
        url = f'/api/v1/users/{self.author.id}/'
        payload = {
            'role': self.role_admin.id
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.author.refresh_from_db()
        self.assertEqual(self.author.role, self.role_admin)

    def test_token_refresh(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.author)
        url = '/api/v1/token/refresh/'
        response = self.client.post(url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
