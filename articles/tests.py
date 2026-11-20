from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import Role
from .models import Article, ArticleReview

User = get_user_model()


class ArticleListQueryCountTests(APITestCase):
    """El listado de artículos no debe hacer más consultas al tener más artículos (sin N+1)."""

    def setUp(self):
        self.role_author, _ = Role.objects.get_or_create(name='Autor')
        self.role_committee, _ = Role.objects.get_or_create(name='Miembro Comité Científico')
        self.author = User.objects.create_user(
            username='autor', email='autor@test.com', password='Password123!', role=self.role_author
        )
        self.evaluators = [
            User.objects.create_user(
                username=f'jurado{i}', email=f'jurado{i}@test.com',
                password='Password123!', role=self.role_committee
            )
            for i in range(3)
        ]
        # Autenticación real por JWT (así se ejercita RoleAwareJWTAuthentication)
        token = RefreshToken.for_user(self.author).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _create_articles(self, count, start=0):
        for i in range(start, start + count):
            article = Article.objects.create(
                title=f'Artículo {i}', abstract='Resumen',
                thematic_line='Sistemas Inteligentes', author=self.author
            )
            for evaluator in self.evaluators:
                ArticleReview.objects.create(article=article, evaluator=evaluator)

    def _count_list_queries(self):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get('/api/v1/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return len(ctx), response.data

    def test_query_count_does_not_grow_with_articles(self):
        self._create_articles(2)
        queries_with_2, data_2 = self._count_list_queries()
        self.assertEqual(len(data_2), 2)

        self._create_articles(8, start=2)
        queries_with_10, data_10 = self._count_list_queries()
        self.assertEqual(len(data_10), 10)

        self.assertEqual(queries_with_2, queries_with_10)

    def test_list_includes_evaluator_names(self):
        self._create_articles(1)
        _, data = self._count_list_queries()
        names = {review['evaluator_name'] for review in data[0]['reviews']}
        self.assertEqual(names, {'jurado0', 'jurado1', 'jurado2'})

    def test_authenticated_request_loads_role_without_extra_query(self):
        """Autenticar y evaluar permisos no debe requerir una consulta aparte para el rol."""
        self._create_articles(1)
        with CaptureQueriesContext(connection) as ctx:
            self.client.get('/api/v1/articles/')
        role_queries = [q for q in ctx.captured_queries if 'users_role' in q['sql'] and 'JOIN' not in q['sql']]
        self.assertEqual(role_queries, [])
