import random
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
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

def assign_evaluators_to_article(article, evaluator_ids=None):
    """
    Asigna jurados (miembros del comité científico) a un artículo:
    - Si `evaluator_ids` es None: selecciona 3 evaluadores al azar.
    - Si `evaluator_ids` se envía: valida y asigna entre 1 y 3 jurados seleccionados manualmente
      (incluyendo autoasignación del miembro del comité, salvo si es el autor del artículo).
    """
    if evaluator_ids is None:
        if article.reviews.count() >= 3:
            return False, "El artículo ya tiene 3 evaluadores asignados."
        # Obtener miembros del comité científico activos excluyendo al autor
        committee_members = list(
            User.objects.filter(
                roles__name__in=COMMITTEE_ROLE_NAMES,
                is_active=True
            ).exclude(id=article.author_id).distinct()
        )
        if len(committee_members) < 3:
            return False, f"Se requieren al menos 3 miembros del comité científico registrados (hay {len(committee_members)} disponibles)."
        selected_evaluators = random.sample(committee_members, 3)
    else:
        if article.reviews.filter(is_approved__isnull=False).exists():
            return False, "No se pueden reasignar jurados porque el artículo ya tiene evaluaciones registradas."
        try:
            unique_ids = list(dict.fromkeys(int(eid) for eid in evaluator_ids))
        except (TypeError, ValueError):
            return False, "Los identificadores de evaluadores no son válidos."
        if len(unique_ids) > 3:
            return False, "Puedes seleccionar máximo 3 jurados del comité científico."
        if article.author_id in unique_ids:
            return False, "El autor del artículo no puede ser asignado como su propio evaluador."

        if len(unique_ids) == 0:
            with transaction.atomic():
                article.reviews.all().delete()
                if article.status == ArticleStatus.EN_REVISION:
                    article.status = ArticleStatus.POSTULADO
                    article.save(update_fields=['status'])
            return True, f"Se eliminaron los evaluadores asignados al artículo '{article.title}'."

        selected_evaluators = list(
            User.objects.filter(
                id__in=unique_ids,
                roles__name__in=COMMITTEE_ROLE_NAMES,
                is_active=True,
            ).distinct()
        )
        if len(selected_evaluators) != len(unique_ids):
            return False, "Todos los jurados seleccionados deben ser miembros activos del comité científico."

    with transaction.atomic():
        article.reviews.all().delete()
        for member in selected_evaluators:
            ArticleReview.objects.create(
                article=article,
                evaluator=member
            )
        article.status = ArticleStatus.EN_REVISION
        article.save(update_fields=['status'])
    return True, f"Se asignaron {len(selected_evaluators)} evaluador(es) exitosamente al artículo '{article.title}'."


def suggest_evaluators_for_article(article, current_user=None):
    """
    Retorna los miembros activos del comité científico elegibles para evaluar el artículo,
    ordenados por afinidad con la línea temática del artículo y carga actual de revisiones,
    junto con una sugerencia automática de hasta 3 jurados.
    """
    candidates_qs = (
        User.objects.filter(
            roles__name__in=COMMITTEE_ROLE_NAMES,
            is_active=True,
        )
        .exclude(id=article.author_id)
        .annotate(
            thematic_reviews_count=Count(
                'article_reviews',
                filter=Q(article_reviews__article__thematic_line=article.thematic_line),
                distinct=True,
            ),
            total_assigned_count=Count('article_reviews', distinct=True),
        )
        .distinct()
    )

    candidates = []
    for member in candidates_qs:
        candidates.append({
            'id': member.id,
            'username': member.username,
            'full_name': member.get_full_name() or member.username,
            'email': member.email,
            'thematic_reviews_count': member.thematic_reviews_count,
            'total_assigned_count': member.total_assigned_count,
            'is_current_user': bool(current_user and member.id == current_user.id),
        })

    # Priorizar afinidad temática (desc) y luego menor carga de trabajo (asc)
    candidates.sort(key=lambda c: (-c['thematic_reviews_count'], c['total_assigned_count'], c['full_name'].lower()))

    suggested_ids = [c['id'] for c in candidates[:3]]
    assigned_ids = list(article.reviews.values_list('evaluator_id', flat=True))

    return {
        'thematic_line': article.thematic_line,
        'suggested_ids': suggested_ids,
        'assigned_ids': assigned_ids,
        'candidates': candidates,
    }

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