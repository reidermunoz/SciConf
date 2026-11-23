from django.db import models
from django.conf import settings

class ThematicLine(models.TextChoices):
        INTELLIGENT_SYSTEMS = 'Sistemas Inteligentes', 'Sistemas Inteligentes'
        IT_TECHNOLOGIES = 'Tecnologias en informática', 'Tecnologias en informática'
        CS_EDUCATION = 'Educación en informática', 'Educación en informática'
        SOFTWARE_SYSTEMS = 'Sistemas de software', 'Sistemas de software'
        SOFTWARE_IN_PRACTICE = 'Software en la práctica', 'Software en la práctica'

class ArticleStatus(models.TextChoices):
    POSTULADO = 'POSTULADO', 'Postulado'
    EN_REVISION = 'EN_REVISION', 'En revisión'
    ACEPTADO = 'ACEPTADO', 'Aceptado'
    RECHAZADO = 'RECHAZADO', 'Rechazado'
    CORRECCION_ENTREGADA = 'CORRECCION_ENTREGADA', 'Corrección entregada'
    CON_AVAL_PRESENTACION = 'CON_AVAL_PRESENTACION', 'Con aval para presentación'
    FINAL_ENTREGADO = 'FINAL_ENTREGADO', 'Versión final entregada'
    CON_AVAL_PUBLICACION = 'CON_AVAL_PUBLICACION', 'Con aval para publicación'

class VersionType(models.TextChoices):
    INICIAL = 'INICIAL', 'Propuesta inicial'
    CORREGIDA = 'CORREGIDA', 'Versión corregida para presentación'
    FINAL = 'FINAL', 'Versión final para publicación'

class Article(models.Model):
        title=models.CharField(max_length=255, verbose_name='Título')
        abstract = models.TextField(verbose_name='Resumen')
        keywords = models.CharField(max_length=255, blank=True, default='', verbose_name='Palabras clave')
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
        status = models.CharField(
            max_length=30,
            choices=ArticleStatus.choices,
            default=ArticleStatus.POSTULADO,
            verbose_name='Estado'
        )
        created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de postulación')
        updated_at = models.DateTimeField(auto_now=True, verbose_name='Última fecha de modificación')

        class Meta:
            ordering = ['-created_at']
            verbose_name = 'Artículo'
            verbose_name_plural = 'Artículos'

        def __str__(self):
            return f"{self.title} - {self.author.get_full_name() or self.author.username}"


class ArticleCoAuthor(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='coauthors',
        verbose_name='Artículo'
    )
    first_name = models.CharField(max_length=150, verbose_name='Nombre')
    last_name = models.CharField(max_length=150, verbose_name='Apellido')
    email = models.EmailField(verbose_name='Correo electrónico')
    university = models.CharField(max_length=150, verbose_name='Universidad de afiliación')

    class Meta:
        verbose_name = 'Coautor'
        verbose_name_plural = 'Coautores'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.university})"

class ArticleVersion(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='versions',
        verbose_name='Artículo'
    )
    version_type = models.CharField(
        max_length=20,
        choices=VersionType.choices,
        verbose_name='Tipo de versión'
    )
    file = models.FileField(
        upload_to='articles/pdfs/',
        verbose_name='Archivo PDF del artículo'
    )

    # Solo obligatorio en la versión FINAL:
    copyright_file = models.FileField(
        upload_to='articles/copyright/',
        null=True,
        blank=True,
        verbose_name='Cesión de copyright (PDF)'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de subida')
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Versión de artículo'
        verbose_name_plural = 'Versiones de artículos'

    def __str__(self):
        return f"{self.article.title} - {self.get_version_type_display()}"

class ArticleReview(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='Artículo'
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='article_reviews',
        verbose_name='Evaluador (Comité Científico)'
    )
    # Primera evaluación (Aceptado / Rechazado):
    originality_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='Originalidad (1-5)'
    )
    relevance_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='Pertinencia (1-5)'
    )
    technical_quality_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='Calidad Técnica (1-5)'
    )
    comments = models.TextField(
        blank=True,
        null=True,
        verbose_name='Comentarios y retroalimentación'
    )
    is_approved = models.BooleanField(
        null=True,
        blank=True,
        verbose_name='¿Aprobado para la conferencia?'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de evaluación'
    )
    # Aval para presentación (fase de corrección):
    presentation_endorsement = models.BooleanField(
        default=False,
        verbose_name='Aval para presentación'
    )
    presentation_decision = models.BooleanField(
        null=True,
        blank=True,
        verbose_name='Decisión aval presentación'
    )
    presentation_endorsed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha aval presentación'
    )
    # Aval para publicación (fase final):
    publication_endorsement = models.BooleanField(
        default=False,
        verbose_name='Aval para publicación'
    )
    publication_endorsed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha aval publicación'
    )
    class Meta:
        # Un mismo miembro del comité solo puede ser asignado una vez al mismo artículo:
        unique_together = ('article', 'evaluator')
        verbose_name = 'Revisión de artículo'
        verbose_name_plural = 'Revisiones de artículos'
    def __str__(self):
        return f"Revisión de {self.evaluator.username} para {self.article.title}"

class ConferenceDeadline(models.Model):
    """Fechas límite globales para el ciclo de conferencias"""
    submissions_deadline = models.DateTimeField(
        verbose_name='Límite de postulación inicial'
    )
    reviews_deadline = models.DateTimeField(
        verbose_name='Límite de revisiones por jurados'
    )
    corrections_deadline = models.DateTimeField(
        verbose_name='Límite de entrega de correcciones'
    )
    final_deadline = models.DateTimeField(
        verbose_name='Límite de entrega de versión final y copyright'
    )
    copyright_template = models.FileField(
        upload_to='conference/copyright_templates/',
        null=True,
        blank=True,
        verbose_name='Plantilla oficial de copyright (PDF)'
    )
    class Meta:
        verbose_name = 'Fecha límite de la conferencia'
        verbose_name_plural = 'Fechas límite de la conferencia'
    def __str__(self):
        return "Fechas límite de SciConf"