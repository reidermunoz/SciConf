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
            username='autor', email='autor@test.com', password='Password123!'
        )
        self.author.roles.add(self.role_author)
        self.evaluators = []
        for i in range(3):
            evaluator = User.objects.create_user(
                username=f'jurado{i}', email=f'jurado{i}@test.com',
                password='Password123!'
            )
            evaluator.roles.add(self.role_committee)
            self.evaluators.append(evaluator)
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

    def test_author_hides_evaluator_identity_and_sees_only_own_articles(self):
        other_author = User.objects.create_user(
            username='otro_autor', email='otro_autor@test.com', password='Password123!'
        )
        other_author.roles.add(self.role_author)
        Article.objects.create(
            title='Artículo Ajeno', abstract='Resumen ajeno',
            thematic_line='Sistemas Inteligentes', author=other_author
        )

        self._create_articles(1)
        _, data = self._count_list_queries()
        # Solo visualiza su propio artículo, no el del otro autor
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['author'], self.author.id)
        # La identidad de los jurados está oculta para el Autor
        for review in data[0]['reviews']:
            self.assertNotIn('evaluator', review)
            self.assertIsNone(review['evaluator_name'])

    def test_committee_sees_evaluator_names_and_all_articles(self):
        self._create_articles(1)
        committee_token = RefreshToken.for_user(self.evaluators[0]).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {committee_token}')
        response = self.client.get('/api/v1/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {review['evaluator_name'] for review in response.data[0]['reviews']}
        self.assertEqual(names, {'jurado0', 'jurado1', 'jurado2'})

    def test_committee_manual_and_assisted_evaluator_assignment(self):
        article = Article.objects.create(
            title='IA Aplicada', abstract='Resumen IA',
            thematic_line='Sistemas Inteligentes', author=self.author
        )
        committee_token = RefreshToken.for_user(self.evaluators[0]).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {committee_token}')

        # Sugerencias por temática
        suggest_res = self.client.get(f'/api/v1/articles/{article.id}/suggest-evaluators/')
        self.assertEqual(suggest_res.status_code, status.HTTP_200_OK)
        self.assertEqual(suggest_res.data['thematic_line'], 'Sistemas Inteligentes')
        self.assertEqual(len(suggest_res.data['candidates']), 3)

        # Asignación manual incluyendo autoasignación del miembro del comité
        selected_ids = [self.evaluators[0].id, self.evaluators[1].id, self.evaluators[2].id]
        assign_res = self.client.post(
            f'/api/v1/articles/{article.id}/assign-evaluators/',
            {'evaluator_ids': selected_ids},
            format='json'
        )
        self.assertEqual(assign_res.status_code, status.HTTP_200_OK)
        assigned_ids = set(article.reviews.values_list('evaluator_id', flat=True))
        self.assertEqual(assigned_ids, set(selected_ids))

        # Eliminar todos los jurados asignados y guardar cambios
        clear_res = self.client.post(
            f'/api/v1/articles/{article.id}/assign-evaluators/',
            {'evaluator_ids': []},
            format='json'
        )
        self.assertEqual(clear_res.status_code, status.HTTP_200_OK)
        self.assertEqual(article.reviews.count(), 0)
        article.refresh_from_db()
        self.assertEqual(article.status, 'POSTULADO')

    def test_author_create_with_keywords_pdf_coauthors_and_deadline_edit(self):
        import json
        from datetime import timedelta
        from django.utils import timezone
        from django.core.files.uploadedfile import SimpleUploadedFile
        from .models import ConferenceDeadline

        now = timezone.now()
        deadline = ConferenceDeadline.objects.create(
            submissions_deadline=now + timedelta(days=5),
            reviews_deadline=now + timedelta(days=7),
            corrections_deadline=now + timedelta(days=10),
            final_deadline=now + timedelta(days=15),
        )

        # Coautor incompleto (falta university) debe fallar con 400
        bad_res = self.client.post('/api/v1/articles/', {
            'title': 'Artículo Incompleto',
            'abstract': 'Resumen',
            'keywords': 'IA, Redes',
            'thematic_line': 'Sistemas Inteligentes',
            'coauthors': json.dumps([{'first_name': 'Ana', 'last_name': 'Ruiz', 'email': 'ana@uni.edu'}]),
        }, format='multipart')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Creación completa con keywords, PDF inicial y coautor
        pdf_file = SimpleUploadedFile('propuesta.pdf', b'%PDF-1.4 test content', content_type='application/pdf')
        create_res = self.client.post('/api/v1/articles/', {
            'title': 'Artículo Completo',
            'abstract': 'Resumen completo',
            'keywords': 'IA, Ciencia de Datos',
            'thematic_line': 'Sistemas Inteligentes',
            'initial_pdf': pdf_file,
            'coauthors': json.dumps([{
                'first_name': 'Ana',
                'last_name': 'Ruiz',
                'email': 'ana@uni.edu',
                'university': 'Universidad Nacional',
            }]),
        }, format='multipart')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data['keywords'], 'IA, Ciencia de Datos')
        self.assertEqual(len(create_res.data['versions']), 1)
        self.assertEqual(len(create_res.data['coauthors']), 1)
        self.assertEqual(create_res.data['coauthors'][0]['university'], 'Universidad Nacional')

        article_id = create_res.data['id']

        # Edición dentro del plazo
        edit_ok = self.client.patch(f'/api/v1/articles/{article_id}/', {
            'title': 'Artículo Editado',
            'keywords': 'IA, Deep Learning',
        }, format='json')
        self.assertEqual(edit_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_ok.data['title'], 'Artículo Editado')

        # Edición fuera del plazo debe bloquearse
        deadline.submissions_deadline = now - timedelta(hours=1)
        deadline.save()
        edit_blocked = self.client.patch(f'/api/v1/articles/{article_id}/', {
            'title': 'Intento Tardío',
        }, format='json')
        self.assertEqual(edit_blocked.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rubric_evaluation_blind_peer_visibility_and_presentation_endorsement(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from .models import ArticleVersion, VersionType, ArticleStatus

        article = Article.objects.create(
            title='Revisión con Rúbrica',
            abstract='Resumen detallado',
            keywords='Rúbrica, Blind',
            thematic_line='Sistemas Inteligentes',
            author=self.author,
            status=ArticleStatus.EN_REVISION,
        )
        ArticleVersion.objects.create(
            article=article,
            version_type=VersionType.INICIAL,
            file=SimpleUploadedFile('inicial.pdf', b'%PDF-1.4 init', content_type='application/pdf'),
        )
        reviews = [ArticleReview.objects.create(article=article, evaluator=ev) for ev in self.evaluators]

        # Jurado 1 vota primero
        token1 = RefreshToken.for_user(self.evaluators[1]).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token1}')
        r1 = self.client.post(f'/api/v1/reviews/{reviews[1].id}/submit-evaluation/', {
            'originality_score': 5,
            'relevance_score': 4,
            'technical_quality_score': 5,
            'comments': 'Excelente trabajo.',
            'is_approved': True,
        }, format='json')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)

        # Jurado 0 aún no vota -> other_reviews debe estar oculto
        token0 = RefreshToken.for_user(self.evaluators[0]).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token0}')
        before_vote = self.client.get(f'/api/v1/reviews/{reviews[0].id}/')
        self.assertEqual(before_vote.status_code, status.HTTP_200_OK)
        self.assertEqual(before_vote.data['other_reviews'], [])

        # Aval bloqueado antes de aceptar y subir versión corregida
        locked_endorse = self.client.post(f'/api/v1/reviews/{reviews[0].id}/endorse-presentation/', {'approved': True}, format='json')
        self.assertEqual(locked_endorse.status_code, status.HTTP_400_BAD_REQUEST)

        # Jurado 0 vota -> ahora ve la evaluación de Jurado 1 y el artículo pasa a ACEPTADO (2 votos)
        r0 = self.client.post(f'/api/v1/reviews/{reviews[0].id}/submit-evaluation/', {
            'originality_score': 4,
            'relevance_score': 4,
            'technical_quality_score': 4,
            'comments': 'Buen artículo.',
            'is_approved': True,
        }, format='json')
        self.assertEqual(r0.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r0.data['review']['other_reviews']), 1)
        self.assertEqual(r0.data['review']['other_reviews'][0]['originality_score'], 5)

        # Voto definitivo: no puede volver a votar
        duplicate = self.client.post(f'/api/v1/reviews/{reviews[0].id}/submit-evaluation/', {
            'originality_score': 1,
            'relevance_score': 1,
            'technical_quality_score': 1,
            'comments': 'Cambio',
            'is_approved': False,
        }, format='json')
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

        # Autor sube versión corregida -> se habilita Aval para Presentación
        ArticleVersion.objects.create(
            article=article,
            version_type=VersionType.CORREGIDA,
            file=SimpleUploadedFile('corregida.pdf', b'%PDF-1.4 corr', content_type='application/pdf'),
        )
        article.status = ArticleStatus.CORRECCION_ENTREGADA
        article.save(update_fields=['status'])

        e0 = self.client.post(f'/api/v1/reviews/{reviews[0].id}/endorse-presentation/', {'approved': True}, format='json')
        self.assertEqual(e0.status_code, status.HTTP_200_OK)
        self.assertEqual(e0.data['review']['presentation_endorsements_count'], 1)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token1}')
        e1 = self.client.post(f'/api/v1/reviews/{reviews[1].id}/endorse-presentation/', {'approved': True}, format='json')
        self.assertEqual(e1.status_code, status.HTTP_200_OK)
        self.assertEqual(e1.data['article_status'], ArticleStatus.CON_AVAL_PRESENTACION)

    def test_authenticated_request_loads_role_without_extra_query(self):
        """Autenticar y evaluar permisos no debe requerir una consulta aparte para el rol."""
        self._create_articles(1)
        with CaptureQueriesContext(connection) as ctx:
            self.client.get('/api/v1/articles/')
        role_queries = [q for q in ctx.captured_queries if 'users_role' in q['sql'] and 'JOIN' not in q['sql']]
        self.assertEqual(role_queries, [])
