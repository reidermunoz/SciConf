from rest_framework.permissions import BasePermission

ADMIN = 'Administrador del Sistema'
COMMITTEE = 'Miembro Comité Científico'

def get_role_name(user):
    """Devuelve el nombre del rol del usuario o cadena vacia."""
    return getattr(getattr(user, 'role', None), 'name', '')

class IsAdminUser(BasePermission):
    """Solo el administrador del sistema"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role_name(request.user) == ADMIN

class IsAdminOrCommittee(BasePermission):
    """Administrador o Miembro del comité científico"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role_name(request.user) in (ADMIN, COMMITTEE, 'Miembro del Comité Científico')

class CanCreateUser(BasePermission):
    """
    Permite crear usuarios:
    - Usuario anónimo: permitido (registro público como Autor).
    - Usuario autenticado: solo Administrador o Miembro del Comité.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return True
        return get_role_name(request.user) in (ADMIN, COMMITTEE, 'Miembro del Comité Científico')
