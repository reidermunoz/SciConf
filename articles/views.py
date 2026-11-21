import json
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from .models import Article
from .serializers import ArticleSerializer
from rest_framework.decorators import action
from .permissions import IsArticleAuthorOrReadOnly, IsCommitteeMemberOrAdmin
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

from .models import Article, ArticleCoAuthor, ArticleVersion, ArticleReview, ConferenceDeadline, ArticleStatus, VersionType
from .serializers import (
    ArticleSerializer, ArticleCoAuthorSerializer, ArticleVersionSerializer,
    ArticleReviewSerializer, ConferenceDeadlineSerializer
)

from .permissions import IsArticleAuthorOrReadOnly, IsCommitteeMemberOrAdmin, has_role, ROLE_ADMIN, ROLE_COMMITTEE
from .services import (
    can_submit_or_edit_initial_version, can_submit_corrections, can_submit_final_version,
    assign_evaluators_to_article, assign_evaluators_to_all_submitted,
    suggest_evaluators_for_article,
    check_and_update_review_decision, check_and_update_endorsements
)


class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['disable_article', 'assign_evaluators', 'assign_all_evaluators', 'suggest_evaluators']:
            permission_classes = [permissions.IsAuthenticated, IsCommitteeMemberOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated, IsArticleAuthorOrReadOnly]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        # 'reviews__evaluator' evita una consulta por cada revisión (evaluator_name)
        queryset = (
            Article.objects
            .select_related('author')
            .prefetch_related('versions', 'coauthors', 'reviews__evaluator')
            .all()
        )
        # Los artículos deshabilitados desaparecen de las consultas
        queryset = queryset.filter(is_active=True)
        # Los Autores visualizan sus propios artículos y aquellos donde figuran como coautores
        if not has_role(self.request.user, ROLE_ADMIN, ROLE_COMMITTEE, 'Miembro del Comité Científico'):
            queryset = queryset.filter(
                Q(author=self.request.user) | Q(coauthors__email__iexact=self.request.user.email)
            ).distinct()
        thematic_line = self.request.query_params.get('thematic_line')
        if thematic_line:
            queryset = queryset.filter(thematic_line=thematic_line)
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset
    
    def _parse_coauthors(self, raw_coauthors):
        if raw_coauthors is None:
            return None, None
        if isinstance(raw_coauthors, str):
            raw_coauthors = raw_coauthors.strip()
            if not raw_coauthors:
                return [], None
            try:
                raw_coauthors = json.loads(raw_coauthors)
            except json.JSONDecodeError:
                return None, {'coauthors': 'El formato de coautores no es válido.'}
        if not isinstance(raw_coauthors, list):
            return None, {'coauthors': 'Los coautores deben enviarse como una lista.'}
        coauthor_serializer = ArticleCoAuthorSerializer(data=raw_coauthors, many=True)
        if not coauthor_serializer.is_valid():
            return None, {'coauthors': coauthor_serializer.errors}
        return coauthor_serializer.validated_data, None

    def create(self, request, *args, **kwargs):
        if not has_role(request.user, ROLE_ADMIN) and not can_submit_or_edit_initial_version():
            return Response(
                {'error': 'El plazo de postulación inicial ha finalizado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        coauthors_data, coauthor_errors = self._parse_coauthors(request.data.get('coauthors'))
        if coauthor_errors:
            return Response(coauthor_errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        initial_pdf = request.FILES.get('initial_pdf')

        with transaction.atomic():
            article = serializer.save(author=request.user)
            if coauthors_data:
                ArticleCoAuthor.objects.bulk_create([
                    ArticleCoAuthor(article=article, **coauthor)
                    for coauthor in coauthors_data
                ])
            if initial_pdf:
                ArticleVersion.objects.create(
                    article=article,
                    version_type=VersionType.INICIAL,
                    file=initial_pdf
                )

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(article).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        if not has_role(request.user, ROLE_ADMIN) and not can_submit_or_edit_initial_version():
            return Response(
                {'error': 'No puedes editar el artículo porque el plazo de postulación ha finalizado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        has_coauthors = 'coauthors' in request.data
        coauthors_data, coauthor_errors = (
            self._parse_coauthors(request.data.get('coauthors')) if has_coauthors else (None, None)
        )
        if coauthor_errors:
            return Response(coauthor_errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        initial_pdf = request.FILES.get('initial_pdf')

        with transaction.atomic():
            article = serializer.save()
            if has_coauthors:
                article.coauthors.all().delete()
                if coauthors_data:
                    ArticleCoAuthor.objects.bulk_create([
                        ArticleCoAuthor(article=article, **coauthor)
                        for coauthor in coauthors_data
                    ])
            if initial_pdf:
                ArticleVersion.objects.create(
                    article=article,
                    version_type=VersionType.INICIAL,
                    file=initial_pdf
                )

        return Response(self.get_serializer(article).data)

    # Subida de versiones PDF
    @action(detail=True, methods=['post'], url_path='upload-version')
    def upload_version(self, request, pk=None):
        article = self.get_object()

        # Solo el autor puede subir versiones de su propio artículo
        if article.author != request.user:
            return Response({'error': 'Solo el autor puede subir versiones de este artículo.'}, status=status.HTTP_403_FORBIDDEN)
        version_type = request.data.get('version_type', VersionType.INICIAL)
        file = request.FILES.get('file')
        copyright_file = request.FILES.get('copyright_file')
        if not file:
            return Response({'error': 'Debes adjuntar el archivo PDF del artículo.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validaciones según el tipo de versión y fechas límite
        if version_type == VersionType.INICIAL:
            if not can_submit_or_edit_initial_version():
                return Response({'error': 'La fecha límite para postular o modificar la propuesta inicial ha vencido.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Si se actualiza la versión inicial, se mantiene POSTULADO
            article.status = ArticleStatus.POSTULADO
        elif version_type == VersionType.CORREGIDA:
            if article.status not in [ArticleStatus.ACEPTADO, ArticleStatus.CORRECCION_ENTREGADA]:
                return Response({'error': 'Solo se pueden entregar correcciones si el artículo fue ACEPTADO.'}, status=status.HTTP_400_BAD_REQUEST)
            if not can_submit_corrections():
                return Response({'error': 'La fecha límite para entrega de correcciones ha vencido.'}, status=status.HTTP_400_BAD_REQUEST)
            article.status = ArticleStatus.CORRECCION_ENTREGADA
        elif version_type == VersionType.FINAL:
            if article.status not in [ArticleStatus.CON_AVAL_PRESENTACION, ArticleStatus.FINAL_ENTREGADO]:
                return Response({'error': 'Solo se puede entregar la versión final si cuenta con aval para presentación.'}, status=status.HTTP_400_BAD_REQUEST)
            if not copyright_file and not article.versions.filter(version_type=VersionType.FINAL).exists():
                return Response({'error': 'Para la versión final es obligatorio adjuntar el documento PDF de cesión de copyright.'}, status=status.HTTP_400_BAD_REQUEST)
            if not can_submit_final_version():
                return Response({'error': 'La fecha límite para entrega final ha vencido.'}, status=status.HTTP_400_BAD_REQUEST)
            article.status = ArticleStatus.FINAL_ENTREGADO
        else:
            return Response({'error': 'Tipo de versión no válido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear registro de versión
        version = ArticleVersion.objects.create(
            article=article,
            version_type=version_type,
            file=file,
            copyright_file=copyright_file
        )
        
        article.save(update_fields=['status'])
        return Response({
            'message': f'Versión {version.get_version_type_display()} subida correctamente.',
            'version': ArticleVersionSerializer(version).data,
            'article_status': article.status
        }, status=status.HTTP_201_CREATED)
    
    # Sugerir evaluadores agrupados por línea temática
    @action(detail=True, methods=['get'], url_path='suggest-evaluators')
    def suggest_evaluators(self, request, pk=None):
        article = self.get_object()
        data = suggest_evaluators_for_article(article, current_user=request.user)
        return Response(data, status=status.HTTP_200_OK)

    # Asignar evaluadores (manual/asistida o aleatoria) a un artículo
    @action(detail=True, methods=['post'], url_path='assign-evaluators')
    def assign_evaluators(self, request, pk=None):
        article = self.get_object()
        evaluator_ids = request.data.get('evaluator_ids')
        success, message = assign_evaluators_to_article(article, evaluator_ids=evaluator_ids)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': message, 'article': ArticleSerializer(article, context={'request': request}).data})
    
    # Asignar 3 evaluadores a todos los artículos postulados
    @action(detail=False, methods=['post'], url_path='assign-all-evaluators')
    def assign_all_evaluators(self, request):
        results = assign_evaluators_to_all_submitted()
        return Response({
            'message': f"Asignación masiva completada: {results['assigned']} de {results['total']} artículos asignados.",
            'details': results
        })
    
    # Deshabilitar artículo
    @action(detail=True, methods=['patch', 'post'], url_path='disable')
    def disable_article(self, request, pk=None):
        article = self.get_object()
        is_active = request.data.get('is_active', False)
        reason = request.data.get('deactivation_reason', article.deactivation_reason)
        article.is_active = is_active
        article.deactivation_reason = reason if not is_active else None
        article.save()
        return Response({
            'message': 'Estado del artículo actualizado exitosamente.',
            'article': ArticleSerializer(article).data
        })
    
class ArticleReviewViewSet(viewsets.ModelViewSet):
    """Gestión de evaluaciones y avales por los jurados del comité científico."""
    serializer_class = ArticleReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        base_qs = (
            ArticleReview.objects
            .select_related('article', 'evaluator')
            .prefetch_related('article__versions', 'article__reviews__evaluator')
        )

        # El Administrador ve todas las evaluaciones
        if has_role(user, ROLE_ADMIN):
            return base_qs.all()
        
        # El evaluador solo ve las que tiene asignadas
        return base_qs.filter(evaluator=user)
    
    # Evaluación inicial (Aprobado / Rechazado con comentarios)
    @action(detail=True, methods=['post', 'patch'], url_path='submit-evaluation')
    
    def submit_evaluation(self, request, pk=None):
        review = self.get_object()

        if review.evaluator != request.user and not has_role(request.user, ROLE_ADMIN):
            return Response({'error': 'No tienes permiso para calificar esta revisión.'}, status=status.HTTP_403_FORBIDDEN)
        if review.is_approved is not None:
            return Response({'error': 'Ya enviaste tu evaluación inicial. El voto es definitivo.'}, status=status.HTTP_400_BAD_REQUEST)

        comments = (request.data.get('comments') or '').strip()
        is_approved = request.data.get('is_approved')

        if not comments or is_approved is None:
            return Response({'error': 'Debes enviar los comentarios y la decisión de aprobación.'}, status=status.HTTP_400_BAD_REQUEST)

        scores = {}
        for field in ('originality_score', 'relevance_score', 'technical_quality_score'):
            raw_val = request.data.get(field)
            if raw_val is None or raw_val == '':
                return Response({'error': 'Debes calificar todos los criterios de la rúbrica (1 a 5).'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                val = int(raw_val)
            except (TypeError, ValueError):
                return Response({'error': 'Las calificaciones de la rúbrica deben ser números enteros entre 1 y 5.'}, status=status.HTTP_400_BAD_REQUEST)
            if not (1 <= val <= 5):
                return Response({'error': 'Cada criterio de la rúbrica debe estar entre 1 y 5.'}, status=status.HTTP_400_BAD_REQUEST)
            scores[field] = val

        review.originality_score = scores['originality_score']
        review.relevance_score = scores['relevance_score']
        review.technical_quality_score = scores['technical_quality_score']
        review.comments = comments
        review.is_approved = bool(is_approved)
        review.reviewed_at = timezone.now()
        review.save()

        # Comprobar regla de la mayoría (2 o más votos)
        _, decision_msg = check_and_update_review_decision(review.article)
        review = self.get_object()
        return Response({
            'message': 'Evaluación registrada correctamente.',
            'decision_status': decision_msg,
            'review': ArticleReviewSerializer(review, context={'request': request}).data
        })
    
    # Aval para presentación
    @action(detail=True, methods=['post'], url_path='endorse-presentation')
    def endorse_presentation(self, request, pk=None):
        review = self.get_object()
        
        if review.evaluator != request.user and not has_role(request.user, ROLE_ADMIN):
            return Response({'error': 'No tienes permiso para emitir este aval.'}, status=status.HTTP_403_FORBIDDEN)

        has_corrected_version = review.article.versions.filter(version_type=VersionType.CORREGIDA).exists()
        allowed_statuses = [
            ArticleStatus.ACEPTADO,
            ArticleStatus.CORRECCION_ENTREGADA,
            ArticleStatus.CON_AVAL_PRESENTACION,
        ]
        if review.article.status not in allowed_statuses or not has_corrected_version:
            return Response(
                {'error': 'Disponible cuando el artículo sea ACEPTADO y el autor suba su versión corregida.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if review.presentation_decision is not None:
            return Response(
                {'error': 'Ya registraste tu decisión de aval para presentación.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        approved = request.data.get('approved', True)
        review.presentation_decision = bool(approved)
        review.presentation_endorsement = bool(approved)
        review.presentation_endorsed_at = timezone.now()
        review.save()
        check_and_update_endorsements(review.article)
        review = self.get_object()
        
        return Response({
            'message': 'Aval para presentación emitido correctamente.' if approved else 'Decisión registrada: corrección no avalada.',
            'article_status': review.article.status,
            'review': ArticleReviewSerializer(review, context={'request': request}).data,
        })
    
    # Aval para publicación
    @action(detail=True, methods=['post'], url_path='endorse-publication')
    def endorse_publication(self, request, pk=None):
        review = self.get_object()
        
        if review.evaluator != request.user and not has_role(request.user, ROLE_ADMIN):
            return Response({'error': 'No tienes permiso para emitir este aval.'}, status=status.HTTP_403_FORBIDDEN)
        review.publication_endorsement = True
        review.publication_endorsed_at = timezone.now()
        review.save()
        check_and_update_endorsements(review.article)
        return Response({
            'message': 'Aval para publicación emitido correctamente.',
            'article_status': review.article.status
        })
    
class ConferenceDeadlineViewSet(viewsets.ModelViewSet):
    """Consulta y configuración de fechas límite de la conferencia."""
    queryset = ConferenceDeadline.objects.all()
    serializer_class = ConferenceDeadlineSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsCommitteeMemberOrAdmin()]
        return [permissions.IsAuthenticated()]
    
    def list(self, request, *args, **kwargs):
        deadline = ConferenceDeadline.objects.first()
        if not deadline:
            return Response({'detail': 'No se han configurado fechas límite.'}, status=status.HTTP_200_OK)
        return Response(ConferenceDeadlineSerializer(deadline).data)