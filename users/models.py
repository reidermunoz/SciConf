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
