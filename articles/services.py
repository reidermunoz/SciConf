import random
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Article, ArticleStatus, ArticleReview, ConferenceDeadline

User = get_user_model()

COMMITTEE_ROLE_NAMES = ['Miembro Comité Científico', 'Miembro del Comité Científico']

def get_conference_deadlines():
    """Obtiene la configuración de fechas límite activa."""
    return ConferenceDeadline.objects.first()

def can_submit_or_edit_initial_version():
    """Valida si aún está abierto el periodo de postulaciones iniciales."""
    deadline = get_conference_deadlines()
    if not deadline:
        return True  # Si no se han definido fechas, se permite
    return timezone.now() <= deadline.submissions_deadline

def can_submit_corrections():
    """Valida si aún está abierto el periodo de entrega de correcciones."""
    deadline = get_conference_deadlines()
    if not deadline:
        return True
    return timezone.now() <= deadline.corrections_deadline

def can_submit_final_version():
    """Valida si aún está abierto el periodo de entrega final con copyright."""
    deadline = get_conference_deadlines()
    if not deadline:
        return True
    return timezone.now() <= deadline.final_deadline

def assign_evaluators_to_article(article):
    """
    Asigna exactamente 3 miembros del comité científico al artículo de forma aleatoria,
    excluyendo al autor del artículo.
    """
    if article.reviews.count() >= 3:
        return False, "El artículo ya tiene 3 evaluadores asignados."
    # Obtener miembros del comité científico activos excluyendo al autor
    committee_members = list(
        User.objects.filter(
            role__name__in=COMMITTEE_ROLE_NAMES,
            is_active=True
        ).exclude(id=article.author_id)
    )
    if len(committee_members) < 3:
        return False, f"Se requieren al menos 3 miembros del comité científico registrados (hay {len(committee_members)} disponibles)."
    # Seleccionar 3 jurados al azar
    selected_evaluators = random.sample(committee_members, 3)
    with transaction.atomic():
        # Limpiar asignaciones previas si existieran incompletas
        article.reviews.all().delete()
        for member in selected_evaluators:
            ArticleReview.objects.create(
                article=article,
                evaluator=member
            )
        article.status = ArticleStatus.EN_REVISION
        article.save(update_fields=['status'])
    return True, f"Se asignaron 3 evaluadores exitosamente al artículo '{article.title}'."

def assign_evaluators_to_all_submitted():
    """
    Asigna 3 jurados a todos los artículos en estado POSTULADO y activos.
    Útil para ejecutar al cierre de la fecha límite de postulaciones.
    """
    articles = Article.objects.filter(
        status=ArticleStatus.POSTULADO,
        is_active=True
    )
    results = {
        'total': articles.count(),
        'assigned': 0,
        'errors': []
    }
    for art in articles:
        success, msg = assign_evaluators_to_article(art)
        if success:
            results['assigned'] += 1
        else:
            results['errors'].append({'article_id': art.id, 'title': art.title, 'error': msg})
    return results

def check_and_update_review_decision(article):
    """
    Evalúa las revisiones de los jurados:
    - Si 2 o más evaluadores aprueban (is_approved=True) -> ACEPTADO.
    - Si 2 o más evaluadores rechazan (is_approved=False) -> RECHAZADO.
    """
    reviews = article.reviews.filter(is_approved__isnull=False)
    approved_count = reviews.filter(is_approved=True).count()
    rejected_count = reviews.filter(is_approved=False).count()
    if approved_count >= 2:
        article.status = ArticleStatus.ACEPTADO
        article.save(update_fields=['status'])
        return True, "Artículo ACEPTADO por mayoría de votos."
    elif rejected_count >= 2:
        article.status = ArticleStatus.RECHAZADO
        article.save(update_fields=['status'])
        return True, "Artículo RECHAZADO por mayoría de votos."
    return False, f"Aún no hay decisión definitiva ({approved_count} votos a favor, {rejected_count} en contra)."

def check_and_update_endorsements(article):
    """
    Verifica los avales de los jurados asignados para presentación o publicación:
    - Si todos (o la mayoría) otorgan aval de corrección -> CON_AVAL_PRESENTACION.
    - Si todos (o la mayoría) otorgan aval final -> CON_AVAL_PUBLICACION.
    """
    reviews = article.reviews.all()
    if not reviews.exists():
        return False, "No hay evaluadores asignados."
    total_reviews = reviews.count()

    # Verificar aval para presentación
    if article.status == ArticleStatus.CORRECCION_ENTREGADA:
        pres_endorsements = reviews.filter(presentation_endorsement=True).count()

        # Requiere al menos mayoría (2 de 3)
        if pres_endorsements >= 2:
            article.status = ArticleStatus.CON_AVAL_PRESENTACION
            article.save(update_fields=['status'])
            return True, "Artículo cuenta con aval para presentación."
        
    # Verificar aval para publicación
    elif article.status == ArticleStatus.FINAL_ENTREGADO:
        pub_endorsements = reviews.filter(publication_endorsement=True).count()
        if pub_endorsements >= 2:
            article.status = ArticleStatus.CON_AVAL_PUBLICACION
            article.save(update_fields=['status'])
            return True, "Artículo cuenta con aval para publicación."
    return False, "Aún no se alcanzan los avales necesarios."