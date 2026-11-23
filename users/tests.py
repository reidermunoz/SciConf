from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import Role

User = get_user_model()

class UserUpdateTests(APITestCase):
    def setUp(self):
        self.role_author, _ = Role.objects.get_or_create(name='Autor')
        self.role_committee, _ = Role.objects.get_or_create(name='Miembro Comité Científico')
        self.role_admin, _ = Role.objects.get_or_create(name='Administrador del Sistema')

        self.author = User.objects.create_user(
            username='autor1',
            email='autor1@test.com',
            password='Password123!',
            first_name='Juan',
            last_name='Perez',
            phone='123456789',
            institution='Universidad Test',
        )
        self.author.roles.add(self.role_author)

        self.admin = User.objects.create_user(
            username='admin1',
            email='admin1@test.com',
            password='AdminPassword123!',
        )
        self.admin.roles.add(self.role_admin)

        self.committee = User.objects.create_user(
            username='comite1',
            email='comite1@test.com',
            password='CommitteePassword123!',
        )
        self.committee.roles.add(self.role_committee)

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

        # Sin contraseña actual o con contraseña actual incorrecta debe fallar
        bad_res = self.client.patch(url, {
            'current_password': 'WrongPassword!',
            'password': 'NewSecretPassword999!',
        }, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Con contraseña actual correcta debe actualizar
        response = self.client.patch(url, {
            'current_password': 'Password123!',
            'password': 'NewSecretPassword999!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.author.refresh_from_db()
        self.assertTrue(self.author.check_password('NewSecretPassword999!'))

    def test_author_cannot_change_role(self):
        self.client.force_authenticate(user=self.author)
        url = f'/api/v1/users/{self.author.id}/'
        payload = {
            'roles': [self.role_admin.id]
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.author.refresh_from_db()
        self.assertEqual(list(self.author.roles.all()), [self.role_author])

    def test_admin_can_assign_multiple_roles(self):
        self.client.force_authenticate(user=self.admin)
        url = f'/api/v1/users/{self.author.id}/'
        payload = {
            'roles': [self.role_author.id, self.role_committee.id, self.role_admin.id]
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.author.refresh_from_db()
        self.assertCountEqual(
            list(self.author.roles.all()),
            [self.role_author, self.role_committee, self.role_admin]
        )

    def test_committee_can_assign_author_and_committee_on_create(self):
        self.client.force_authenticate(user=self.committee)
        response = self.client.post('/api/v1/users/', {
            'username': 'nuevo_comite',
            'email': 'nuevo_comite@test.com',
            'password': 'Password123!',
            'first_name': 'Ana',
            'last_name': 'Lopez',
            'roles': [self.role_author.id, self.role_committee.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username='nuevo_comite')
        self.assertCountEqual(
            list(created.roles.all()),
            [self.role_author, self.role_committee]
        )

    def test_committee_cannot_assign_admin_on_create(self):
        self.client.force_authenticate(user=self.committee)
        response = self.client.post('/api/v1/users/', {
            'username': 'intento_admin',
            'email': 'intento_admin@test.com',
            'password': 'Password123!',
            'first_name': 'Luis',
            'last_name': 'Gomez',
            'roles': [self.role_admin.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='intento_admin').exists())

    def test_author_only_queries_own_data(self):
        self.client.force_authenticate(user=self.author)

        list_response = self.client.get('/api/v1/users/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['id'], self.author.id)

        own_detail = self.client.get(f'/api/v1/users/{self.author.id}/')
        self.assertEqual(own_detail.status_code, status.HTTP_200_OK)

        other_detail = self.client.get(f'/api/v1/users/{self.admin.id}/')
        self.assertEqual(other_detail.status_code, status.HTTP_403_FORBIDDEN)

    def test_committee_can_query_all_users(self):
        self.client.force_authenticate(user=self.committee)

        list_response = self.client.get('/api/v1/users/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data), 3)

        other_detail = self.client.get(f'/api/v1/users/{self.author.id}/')
        self.assertEqual(other_detail.status_code, status.HTTP_200_OK)

    def test_author_cannot_edit_third_party(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.patch(
            f'/api/v1/users/{self.committee.id}/',
            {'first_name': 'Hack'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_committee_cannot_edit_admin(self):
        self.client.force_authenticate(user=self.committee)
        response = self.client.patch(
            f'/api/v1/users/{self.admin.id}/',
            {'first_name': 'Intento'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_committee_can_edit_author_username_and_lower_roles_only(self):
        self.client.force_authenticate(user=self.committee)
        # Puede editar username y asignar Autor + Comité
        ok_response = self.client.patch(
            f'/api/v1/users/{self.author.id}/',
            {
                'username': 'autor_renombrado',
                'roles': [self.role_author.id, self.role_committee.id],
            },
            format='json'
        )
        self.assertEqual(ok_response.status_code, status.HTTP_200_OK)
        self.author.refresh_from_db()
        self.assertEqual(self.author.username, 'autor_renombrado')
        self.assertCountEqual(
            list(self.author.roles.all()),
            [self.role_author, self.role_committee]
        )

        # No puede asignar rol de Administrador
        forbidden_response = self.client.patch(
            f'/api/v1/users/{self.author.id}/',
            {'roles': [self.role_admin.id]},
            format='json'
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_or_deactivate_user_respects_review_history(self):
        from articles.models import Article, ArticleReview

        juror = User.objects.create_user(
            username='jurado_hist', email='jurado_hist@test.com', password='Password123!'
        )
        juror.roles.add(self.role_committee)
        art = Article.objects.create(
            title='Art Test', abstract='Abs', keywords='K',
            thematic_line='Sistemas Inteligentes', author=self.author
        )
        review = ArticleReview.objects.create(article=art, evaluator=juror)

        self.client.force_authenticate(user=self.admin)
        # Con evaluación pendiente: bloqueado (400)
        res_pending = self.client.delete(f'/api/v1/users/{juror.id}/')
        self.assertEqual(res_pending.status_code, status.HTTP_400_BAD_REQUEST)

        # Con evaluación completada: solo desactiva para conservar historial
        review.is_approved = True
        review.comments = 'Bien'
        review.save()
        res_history = self.client.delete(f'/api/v1/users/{juror.id}/')
        self.assertEqual(res_history.status_code, status.HTTP_200_OK)
        juror.refresh_from_db()
        self.assertFalse(juror.is_active)

    def test_login_captcha_bypass_requires_debug_and_setting(self):
        from django.test import override_settings

        payload = {
            'email': 'autor1@test.com',
            'password': 'Password123!',
            'captcha_key': 'bypass-dev-token',
            'captcha_input': 'BYPAS',
        }

        # DEBUG=True + BYPASS_CAPTCHA=True -> permite acceso con token de prueba
        with override_settings(DEBUG=True, BYPASS_CAPTCHA=True):
            res_ok = self.client.post('/api/v1/login/', payload, format='json')
            self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
            self.assertIn('access', res_ok.data)

        # DEBUG=False + BYPASS_CAPTCHA=True -> exige CAPTCHA válido
        with override_settings(DEBUG=False, BYPASS_CAPTCHA=True):
            res_prod = self.client.post('/api/v1/login/', payload, format='json')
            self.assertEqual(res_prod.status_code, status.HTTP_400_BAD_REQUEST)

        # DEBUG=True + BYPASS_CAPTCHA=False -> exige CAPTCHA válido
        with override_settings(DEBUG=True, BYPASS_CAPTCHA=False):
            res_strict = self.client.post('/api/v1/login/', payload, format='json')
            self.assertEqual(res_strict.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_refresh(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.author)
        url = '/api/v1/token/refresh/'
        response = self.client.post(url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
