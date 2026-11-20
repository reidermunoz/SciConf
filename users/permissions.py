from rest_framework.permissions import BasePermission

ADMIN = 'Administrador del Sistema'
COMMITTEE = 'Miembro Comité Científico'
COMMITTEE_ROLES = (COMMITTEE, 'Miembro del Comité Científico')

def get_role_names(user):
    """Devuelve la lista de nombres de roles del usuario."""
    if not user or not user.is_authenticated:
        return []
    return [role.name for role in user.roles.all()]

def has_role(user, *role_names):
    """Verifica si el usuario posee al menos uno de los roles indicados."""
    if not user or not user.is_authenticated:
        return False
    return bool(set(get_role_names(user)).intersection(role_names))

class IsAdminUser(BasePermission):
    """Solo el administrador del sistema"""
    def has_permission(self, request, view):
        return has_role(request.user, ADMIN)

class IsAdminOrCommittee(BasePermission):
    """Administrador o Miembro del comité científico"""
    def has_permission(self, request, view):
        return has_role(request.user, ADMIN, *COMMITTEE_ROLES)

class CanCreateUser(BasePermission):
    """
    Permite crear usuarios:
    - Usuario anónimo: permitido (registro público como Autor).
    - Usuario autenticado: solo Administrador o Miembro del Comité.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return True
        return has_role(request.user, ADMIN, *COMMITTEE_ROLES)
