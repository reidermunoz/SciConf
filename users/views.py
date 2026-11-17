from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer
from .permissions import IsAdminOrCommittee, IsAdminUser, CanCreateUser, get_role_name, ADMIN, COMMITTEE
from django.db import models

import random 
from django.core.mail import send_mail
from .models import User, Role, PasswordResetCode
from rest_framework_simplejwt.tokens import RefreshToken

import string
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

class CaptchaView(APIView):
    """
    Genera un reto CAPTCHA visual en formato SVG firmado criptográficamente.
    Válido por 5 minutos.
    """
    def get(self, request):
        # Caracteres alfanuméricos legibles (sin 0/O ni 1/I para evitar confusiones)
        chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
        code = ''.join(random.choices(chars, k=5))
        # Firma el código con TimestampSigner
        signer = TimestampSigner(salt='sciconf-captcha')
        captcha_key = signer.sign(code)
        # Genera el SVG visual con ruido y rotación
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="46" viewBox="0 0 160 46">'
            f'<rect width="100%" height="100%" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>'
            f'<line x1="10" y1="32" x2="150" y2="14" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4"/>'
            f'<line x1="20" y1="12" x2="140" y2="36" stroke="#cbd5e1" stroke-width="1.5"/>'
            f'<text x="50%" y="62%" font-family="monospace" font-size="24" font-weight="bold" '
            f'fill="#1e293b" text-anchor="middle" letter-spacing="6" transform="rotate(-2 80 23)">{code}</text>'
            f'</svg>'
        )
        return Response({
            'captcha_key': captcha_key,
            'captcha_svg': svg,
        }, status=status.HTTP_200_OK)

# Create your views here.

class LoginView(APIView):
    def post(self, request):
        identifier = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        captcha_key = request.data.get('captcha_key')
        captcha_input = (request.data.get('captcha_input') or '').strip().upper()
        if not identifier or not password:
            return Response(
                {'error': 'Debes ingresar tu correo/usuario y contraseña.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 1. Validación de presencia del CAPTCHA
        if not captcha_key or not captcha_input:
            return Response(
                {'error': 'Por favor ingresa el código CAPTCHA de seguridad.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 2. Validación criptográfica y de expiración (5 minutos)
        signer = TimestampSigner(salt='sciconf-captcha')
        try:
            expected_code = signer.unsign(captcha_key, max_age=300)
            if captcha_input != expected_code.upper():
                return Response(
                    {'error': 'El código CAPTCHA es incorrecto. Inténtalo nuevamente.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except SignatureExpired:
            return Response(
                {'error': 'El código CAPTCHA ha expirado. Por favor recárgalo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except BadSignature:
            return Response(
                {'error': 'El código CAPTCHA es inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 3. Busca por correo o por username
        user = User.objects.filter(email=identifier).first() or User.objects.filter(username=identifier).first()
        if user and user.check_password(password):
            # Genera los tokens JWT para este usuario
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),  # Token de acceso (8h)
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone or "",
                    'institution': user.institution or "",
                    'role': user.role.name if user.role else None,
                }
            }, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Credenciales inválidas. Revisa el correo y la contraseña.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        """
        Filtros disponibles:
        - ?role=Autor               → filtra por nombre de rol
        - ?search=juan              → busca en nombre, apellido o email
        - ?role=Autor&search=juan   → ambos filtros combinados
        """
        queryset = User.objects.select_related('role').all()

        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        if role:
            queryset = queryset.filter(role__name__icontains=role)

        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)  |
                models.Q(email__icontains=search)      |
                models.Q(username__icontains=search)
            )

        return queryset

    def get_permissions(self):
        if self.action == 'create':
            # Registro público para anónimos, pero si ya está autenticado solo Admin o Comité pueden crear usuarios
            permission_classes = [CanCreateUser]
        elif self.action in ('list', 'retrieve'):
            # Listar/consultar: solo usuarios autenticados
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ('update', 'partial_update'):
            # Editar: autenticado (la lógica de "propio usuario" va en update())
            permission_classes = [permissions.IsAuthenticated]
        else:
            # destroy: solo Admin o Comité
            permission_classes = [permissions.IsAuthenticated, IsAdminOrCommittee]
        return [p() for p in permission_classes]

    def has_object_permission_to_update(self, request, obj):
        """Puede editar si es el propio usuario O es Admin/Comité."""
        role = get_role_name(request.user)
        return obj == request.user or role in (ADMIN, COMMITTEE, 'Miembro del Comité Científico')

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # Verifica permiso de objeto
        if not self.has_object_permission_to_update(request, instance):
            return Response(
                {'error': 'No tienes permiso para editar este usuario.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Solo el Admin puede cambiar el campo 'role'
        if 'role' in request.data:
            new_role = request.data.get('role')
            current_role_id = instance.role_id if instance.role else None
            # Si se intenta cambiar el rol y no es Admin
            if new_role != current_role_id and get_role_name(request.user) != ADMIN:
                return Response(
                    {'error': 'Solo el Administrador del Sistema puede cambiar roles.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

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