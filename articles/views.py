from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from .models import Article
from .serializers import ArticleSerializer
from rest_framework.decorators import action
from .permissions import IsArticleAuthorOrReadOnly, IsCommitteeMemberOrAdmin
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

from .models import Article, ArticleVersion, ArticleReview, ConferenceDeadline, ArticleStatus, VersionType
from .serializers import (
    ArticleSerializer, ArticleVersionSerializer,
    ArticleReviewSerializer, ConferenceDeadlineSerializer
)

from .permissions import IsArticleAuthorOrReadOnly, IsCommitteeMemberOrAdmin, get_role_name, ROLE_ADMIN, ROLE_COMMITTEE
from .services import (
    can_submit_or_edit_initial_version, can_submit_corrections, can_submit_final_version,
    assign_evaluators_to_article, assign_evaluators_to_all_submitted,
    check_and_update_review_decision, check_and_update_endorsements
)


class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['disable_article', 'assign_evaluators', 'assign_all_evaluators']:
            permission_classes = [permissions.IsAuthenticated, IsCommitteeMemberOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated, IsArticleAuthorOrReadOnly]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = Article.objects.select_related('author').prefetch_related('versions', 'reviews').all()
        thematic_line = self.request.query_params.get('thematic_line')
        if thematic_line:
            queryset = queryset.filter(thematic_line=thematic_line)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ['true', '1'])
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    # Subida de versiones PDF
    @action(detail=True, methods=['post'], url_path='upload-version')
    def upload_version(self, request, pk=None):
        article = self.get_object()

        # Solo el autor o admin pueden subir versiones
        if article.author != request.user and get_role_name(request.user) != ROLE_ADMIN:
            return Response({'error': 'Solo el autor puede subir versiones de este artículo.'}, status=status.HTTP_403_FORBIDDEN)
        version_type = request.data.get('version_type', VersionType.INICIAL)
        file = request.FILES.get('file')
        copyright_file = request.FILES.get('copyright_file')
        if not file:
            return Response({'error': 'Debes adjuntar el archivo PDF del artículo.'}, status=status.HTTP_400_BAD_REQUEST)
                
        # HU-16: el servidor también exige PDF de máximo 10 MB
        if not file.name.lower().endswith('.pdf'):
            return Response({'error': 'El archivo debe ser un PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'El archivo supera el máximo de 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        
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
    
    # Asignar 3 evaluadores a un artículo
    @action(detail=True, methods=['post'], url_path='assign-evaluators')

    def assign_evaluators(self, request, pk=None):
        article = self.get_object()
        success, message = assign_evaluators_to_article(article)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': message, 'article': ArticleSerializer(article).data})
    
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
        role = get_role_name(user)

        # El Administrador ve todas las evaluaciones
        if role == ROLE_ADMIN:
            return ArticleReview.objects.select_related('article', 'evaluator').all()
        
        # El evaluador solo ve las que tiene asignadas
        return ArticleReview.objects.select_related('article', 'evaluator').filter(evaluator=user)
    
    # Evaluación inicial (Aprobado / Rechazado con comentarios)
    @action(detail=True, methods=['post', 'patch'], url_path='submit-evaluation')
    
    def submit_evaluation(self, request, pk=None):
        review = self.get_object()

        if review.evaluator != request.user and get_role_name(request.user) != ROLE_ADMIN:
            return Response({'error': 'No tienes permiso para calificar esta revisión.'}, status=status.HTTP_403_FORBIDDEN)
        comments = request.data.get('comments')
        is_approved = request.data.get('is_approved')

        if comments is None or is_approved is None:
            return Response({'error': 'Debes enviar los comentarios y la decisión de aprobación.'}, status=status.HTTP_400_BAD_REQUEST)
        
        review.comments = comments
        review.is_approved = bool(is_approved)
        review.reviewed_at = timezone.now()
        review.save()

        # Comprobar regla de la mayoría (2 o más votos)
        _, decision_msg = check_and_update_review_decision(review.article)
        return Response({
            'message': 'Evaluación registrada correctamente.',
            'decision_status': decision_msg,
            'review': ArticleReviewSerializer(review).data
        })
    
    # Aval para presentación
    @action(detail=True, methods=['post'], url_path='endorse-presentation')
    
    def endorse_presentation(self, request, pk=None):
        review = self.get_object()
        
        if review.evaluator != request.user and get_role_name(request.user) != ROLE_ADMIN:
            return Response({'error': 'No tienes permiso para emitir este aval.'}, status=status.HTTP_403_FORBIDDEN)
        review.presentation_endorsement = True
        review.presentation_endorsed_at = timezone.now()
        review.save()
        check_and_update_endorsements(review.article)
        
        return Response({
            'message': 'Aval para presentación emitido correctamente.',
            'article_status': review.article.status
        })
    
    # Aval para publicación
    @action(detail=True, methods=['post'], url_path='endorse-publication')
    def endorse_publication(self, request, pk=None):
        review = self.get_object()
        
        if review.evaluator != request.user and get_role_name(request.user) != ROLE_ADMIN:
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