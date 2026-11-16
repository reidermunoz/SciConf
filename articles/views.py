from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from .models import Article
from .serializers import ArticleSerializer
from rest_framework.decorators import action
from .permissions import IsArticleAuthorOrReadOnly, IsCommitteeMemberOrAdmin

class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Para deshabilitar articulo, exigimos rol de comité o admin
        if self.action == 'disable_article':
            permission_classes = [permissions.IsAuthenticated, IsCommitteeMemberOrAdmin]
        else: 
            # Para el resto (crear, listar, actualizar, eliminar), aplicamos la lógica de autor o lectura
            permission_classes = [permissions.IsAuthenticated, IsArticleAuthorOrReadOnly]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        
        # Optimizamos la consulta trayendo los datos del autor en una sola consulta SQL
        queryset = Article.objects.select_related('author').all()

        # 1. Filtro por Línea Temática
        thematic_line = self.request.query_params.get('thematic_line')
        
        if thematic_line:
            queryset = queryset.filter(thematic_line=thematic_line)

        # 2. Filtro por Estado Habilitado / Deshabilitado
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ['true', '1']:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ['false', '0']:
                queryset = queryset.filter(is_active=False)

        # 3. Búsqueda por coincidencia en el título esto es opcional
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset
    
    def perform_create(self, serializer):
        # Asigna automáticamente el usuario que hace la petición como autor del artículo
        serializer.save(author=self.request.user)

    # Acción personalizada para deshabilitar o habilitar un artículo
    @action(detail=True, methods=['patch', 'post'], url_path='disable')
    def disable_article(self, request, pk=None):
        article = self.get_object()
        # Obtenemos el nuevo estado (por defecto False para deshabilitar) y el motivo
        is_active = request.data.get('is_active', False)
        reason = request.data.get('deactivation_reason', article.deactivation_reason)
        article.is_active = is_active
        if not is_active:
            article.deactivation_reason = reason
        else:
            # Si se vuelve a habilitar, se puede limpiar el motivo anterior
            article.deactivation_reason = None
        article.save()
        serializer = self.get_serializer(article)
        return Response(
            {
                'message': 'Estado del artículo actualizado exitosamente.',
                'article': serializer.data
            },
            status=status.HTTP_200_OK
        )

    
    