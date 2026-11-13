from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from rest_framework import viewsets
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer

import random 
from django.core.mail import send_mail
from .models import User, Role, PasswordResetCode


# Create your views here.

class LoginView(APIView):
    def post(self, request):
        identifier = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        if not identifier or not password:
            return Response(
                {'error': 'Debes ingresar tu correo/usuario y contraseña.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Busca por correo o por username
        user = User.objects.filter(email=identifier).first() or User.objects.filter(username=identifier).first()
        if user and user.check_password(password):
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role.name if user.role else None,
            }, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Credenciales inválidas. Revisa el correo y la contraseña.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

class RequestPasswordResetView(APIView):
    """Paso 1: Recibe el correo genera un pin de 6 digitos y lo envia por email real"""
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Debes ingresar un correo electronico.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'error': 'No existe un usuario con este correo electronico.'}, status=status.HTTP_404_NOT_FOUND)

        # Genera un pin aleatorio de 6 digitos 
        code = f"{random.randint(100000,999999)}"

        # Invalida codigos anteriores no usados de este usuario.
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        # Guarda el nuevo pin en la DB
        PasswordResetCode.objects.create(user=user, code=code)

        # Envia el correo mediante el servidor SMTP de Gmail/Google workspace.
        send_mail(
            subject='Código de recuperación de contraseña SciConf',
            message=(
                f"Hola {user.first_name or user.username},\n\n"
                f"Hiciste una solicitud para restablecer tu contraseña en SciConf.\n"
                f"Tu código de verificación es:\n\n"
                f"      {code}\n\n"
                f"Este código es válido durante 15 minutos. \n"
                f"Si no realizaste esta solicitud, puedes ignorar este correo de forma segura."
            ),
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({'message': 'Se ha enviado un código de 6 dígitos a tu correo electrónico.'}, status=status.HTTP_200_OK)


class ConfirmPasswordResetView(APIView):
    """Paso 2: Valida el pin y actualiza la contraseña en la base de datos"""
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')

        if not email or not code or not new_password:
            return Response(
                {'error': 'Todos los campos (correo, PIN y nueva contraseña) son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'La nueva contraseña debe tener al menos 8 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'error': 'Usuario no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)

        # Busca el codigo mas reciente asignado a este usuario
        reset_code = PasswordResetCode.objects.filter(user=user, code=code, is_used=False).order_by('-created_at').first()

        if not reset_code or not reset_code.is_valid():
            return Response(
                {'error': 'El código es inválido o ya ha expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Guarda la nueva contrasena con hashing seguro 
        user.set_password(new_password)
        user.save()

        # Marca el pin como usado para que no se pueda reutilizar.
        reset_code.is_used = True
        reset_code.save()

        return Response({'message': 'Tu contraseña ha sido restablecida exitosamente.'}, status=status.HTTP_200_OK)