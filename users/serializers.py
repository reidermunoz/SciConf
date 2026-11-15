from rest_framework import serializers
from .models import User, Role

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    # La contraseña se recibe al crear pero nunca se devuelve en las respuestas
    password = serializers.CharField(write_only=True, min_length=8)

    # Muestra el nombre del rol al leer, acepta el id del rol al escribir.
    role_detail = RoleSerializer(source='role', read_only=True)
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone', 'institution', 'role', 'role_detail']

    def create(self, validated_data):
        request = self.context.get('request')
        is_admin = (
            request and 
            request.user and 
            request.user.is_authenticated and 
            getattr(getattr(request.user, 'role', None), 'name', '') == 'Administrador del Sistema'
        )

        # Si quien crea NO es Administrador del Sistema, o no envió rol, se fuerza siempre 'Autor'
        if not is_admin or not validated_data.get('role'):
            try:
                validated_data['role'] = Role.objects.get(name='Autor')
            except Role.DoesNotExist:
                pass

        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
