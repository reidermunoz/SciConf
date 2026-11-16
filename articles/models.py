from django.db import models
from django.conf import settings

class ThematicLine(models.TextChoices):
        INTELLIGENT_SYSTEMS = 'Sistemas Inteligentes', 'Sistemas Inteligentes'
        IT_TECHNOLOGIES = 'Tecnologias en informática', 'Tecnologias en informática'
        CS_EDUCATION = 'Educación en informática', 'Educación en informática'
        SOFTWARE_SYSTEMS = 'Sistemas de software', 'Sistemas de software'
        SOFTWARE_IN_PRACTICE = 'Software en la práctica', 'Software en la práctica'


class Article(models.Model):
        title=models.CharField(max_length=255, verbose_name='Título')
        abstract = models.TextField(verbose_name='Resumen')
        thematic_line = models.CharField(
                max_length=50, 
                choices=ThematicLine.choices, 
                verbose_name='Línea temática'
        )

        author = models.ForeignKey(
                settings.AUTH_USER_MODEL,
                on_delete=models.CASCADE,
                related_name='articles',
                verbose_name='Autor'
        )

        is_active = models.BooleanField(
                default=True, 
                verbose_name='Habilitado para la conferencia'
        )

        # Motivo opcional cuando el comite científico decide no habilitar el artículo para la conferencia
        deactivation_reason = models.TextField(
                blank=True, 
                null=True, 
                verbose_name='Motivo de deshabilitación'
        )

        created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de postulación')
        updated_at = models.DateTimeField(auto_now=True, verbose_name='Última fecha de modificación')

        class Meta:
                ordering = ['-created_at']
                verbose_name = 'Artículo'
                verbose_name_plural = 'Artículos'

        def __str__(self):
                return f"{self.title} - {self.author.get_full_name() or self.author.username}"