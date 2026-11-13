import datetime
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    creaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class User(AbstractUser):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, null=True, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    institution = models.CharField(max_length=150, blank=True, null=True)


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes') # Relaciona el pin con el usuario que lo solicito.
    code = models.CharField(max_length=6) # Almacena el pim de 6 digitos
    created_at = models.DateTimeField(auto_now_add=True) # Guarda la fecha y hora exacta en que se genero
    is_used = models.BooleanField(default=False) # Cambia a true cuando el usuario ya cambio su clave y que el pin no sea reutilizable.

    def is_valid(self):
        # El pin es valido durante 15 minutos y solo si no ha sido usado antes.
        return not self.is_used and (timezone.now() - self.created_at) < datetime.timedelta(minutes=15)

    def __str__ (self):
        return f"{self.user.email} - {self.code}"