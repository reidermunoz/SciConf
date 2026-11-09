from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from rest_framework import viewsets
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer


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

