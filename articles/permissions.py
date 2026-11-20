from rest_framework import permissions
from users.permissions import has_role

ROLE_ADMIN = 'Administrador del Sistema'
ROLE_COMMITTEE = 'Miembro Comité Científico'
ROLE_AUTHOR = 'Autor'


class IsArticleAuthorOrReadOnly(permissions.BasePermission):
    """
    - Lectura (GET, HEAD, OPTIONS): Permitida para cualquier usuario autenticado.
    - Creación (POST): Permitida solo para 'Autor' o 'Administrador del Sistema'.
    - Modificación (PUT, PATCH, DELETE): Solo para el autor propietario del artículo (o Admin).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Si es solo lectura (listar / consultar), se permite a todos los autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Para crear artículo, debe ser Autor o Administrador
        if request.method == 'POST':
            return has_role(request.user, ROLE_AUTHOR, ROLE_ADMIN)
        
        # Para otros métodos (PUT, PATCH, DELETE), se delega a has_object_permission
        return True
    def has_object_permission(self, request, view, obj):

        # Lectura permitida a todos
        if request.method in permissions.SAFE_METHODS:
            return True

        # El Administrador tiene acceso total
        if has_role(request.user, ROLE_ADMIN):
            return True
        
        # El autor solo puede modificar su propio artículo
        return obj.author == request.user

    
class IsCommitteeMemberOrAdmin(permissions.BasePermission):
    """
    Permiso exclusivo para Miembros del Comité Científico (y Administrador).
    Usado específicamente para deshabilitar artículos.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(request.user, ROLE_COMMITTEE, 'Miembro del Comité Científico', ROLE_ADMIN)