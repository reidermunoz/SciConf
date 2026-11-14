from rest_framework.permissions import BasePermission

ADMIN = 'Administrador del Sistema'
COMMITTEE = 'Miembro del Comité Científico'

def get_role_name(user):
    """Devuelve el nombre del rol del usuario o cadena vacia."""
    return getattr(user.role, 'name', '')

class IsAdminUser(BasePermission):
    """Solo el administrador del sistema"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role_name(request.user) == ADMIN

class IsAdminOrCommittee(BasePermission):
    """Administrador o Miembro del comite cientifico"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role_name(request.user) in (ADMIN, COMMITTEE)