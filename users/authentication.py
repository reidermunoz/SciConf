from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from django.utils.translation import gettext_lazy as _


class RoleAwareJWTAuthentication(JWTAuthentication):
    """
    Igual que JWTAuthentication, pero carga el usuario junto con sus roles en una
    consulta optimizada (prefetch_related). Los permisos leen `user.roles` en casi todas las
    peticiones; sin esto cada request hacía una consulta extra a la base de datos.
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as e:
            raise InvalidToken(
                _("Token contained no recognizable user identification")
            ) from e

        try:
            user = (
                self.user_model.objects
                .prefetch_related('roles')
                .get(**{api_settings.USER_ID_FIELD: user_id})
            )
        except self.user_model.DoesNotExist as e:
            raise AuthenticationFailed(_("User not found"), code="user_not_found") from e

        if api_settings.CHECK_USER_IS_ACTIVE and not user.is_active:
            raise AuthenticationFailed(_("User is inactive"), code="user_inactive")

        return user
