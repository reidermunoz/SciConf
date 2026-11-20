from rest_framework import serializers
from .models import User, Role
from .permissions import has_role, ADMIN, COMMITTEE_ROLES

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    # La contraseña se recibe al crear o actualizar pero nunca se devuelve en las respuestas
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Muestra los roles al leer, acepta una lista de IDs de roles al escribir.
    roles_detail = RoleSerializer(source='roles', many=True, read_only=True)
    roles = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone', 'institution', 'roles', 'roles_detail', 'is_active']

    def validate_password(self, value):
        if value and len(value) < 8:
            raise serializers.ValidationError('La contraseña debe tener mínimo 8 caracteres.')
        return value

    def validate(self, attrs):
        if not self.instance and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'La contraseña es requerida al crear un usuario.'})
        return attrs

    def create(self, validated_data):
        roles = validated_data.pop('roles', [])
        request = self.context.get('request')
        user_req = request.user if request else None
        is_admin = bool(user_req and has_role(user_req, ADMIN))
        is_committee = bool(user_req and has_role(user_req, *COMMITTEE_ROLES))

        if is_admin:
            chosen_roles = roles
        elif is_committee:
            if any(role.name == ADMIN for role in roles):
                raise serializers.ValidationError({
                    'roles': 'Los miembros del comité científico no pueden asignar el rol de Administrador del Sistema.'
                })
            chosen_roles = roles
        else:
            chosen_roles = []

        # Si no es Admin/Comité, o no se enviaron roles, se asigna 'Autor' por defecto
        if not chosen_roles:
            try:
                chosen_roles = [Role.objects.get(name='Autor')]
            except Role.DoesNotExist:
                chosen_roles = []

        user = User.objects.create_user(**validated_data)
        if chosen_roles:
            user.roles.set(chosen_roles)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        roles = validated_data.pop('roles', None)
        user = super().update(instance, validated_data)
        if roles is not None:
            user.roles.set(roles)
        if password:
            user.set_password(password)
            user.save()
        return user
