import random
from django.core.mail import send_mail
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

def _get_article_conflict_emails(article):
    return {
        email.strip().lower()
        for email in article.coauthors.values_list('email', flat=True)
        if email
    }


def assign_evaluators_to_article(article, evaluator_ids=None):
    """
    Asigna jurados (miembros del comité científico) a un artículo respetando:
    1. Exactamente 3 jurados (o limpiar pendientes).
    2. Máximo 3 artículos asignados por jurado.
    3. Sin conflicto de interés (no autor ni coautor del artículo).
    4. Preservación de jurados que ya enviaron su evaluación en reasignaciones.
    """
    evaluated_ids = set(
        article.reviews.filter(is_approved__isnull=False).values_list('evaluator_id', flat=True)
    )
    existing_ids = set(article.reviews.values_list('evaluator_id', flat=True))
    coauthor_emails = _get_article_conflict_emails(article)

    if evaluator_ids is None:
        if len(existing_ids) >= 3:
            return False, "El artículo ya tiene 3 evaluadores asignados."
        slots_needed = 3 - len(existing_ids)
        eligible_qs = (
            User.objects.filter(
                roles__name__in=COMMITTEE_ROLE_NAMES,
                is_active=True,
            )
            .exclude(id=article.author_id)
            .exclude(id__in=existing_ids)
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
        eligible_members = [
            m for m in eligible_qs
            if (m.email or '').strip().lower() not in coauthor_emails and m.total_assigned_count < 3
        ]
        if len(eligible_members) < slots_needed:
            return (
                False,
                f"No hay suficientes jurados elegibles sin conflicto de interés y con cupo disponible (< 3 asignados). Disponibles: {len(eligible_members)}.",
            )
        # Priorizar afinidad temática y luego selección aleatoria dentro del nivel de afinidad
        thematic_matches = [m for m in eligible_members if m.thematic_reviews_count > 0]
        other_eligible = [m for m in eligible_members if m.thematic_reviews_count == 0]
        if len(thematic_matches) >= slots_needed:
            selected_new = random.sample(thematic_matches, slots_needed)
        else:
            remaining = slots_needed - len(thematic_matches)
            selected_new = thematic_matches + random.sample(other_eligible, remaining)
        target_ids = list(existing_ids) + [m.id for m in selected_new]
    else:
        try:
            unique_ids = list(dict.fromkeys(int(eid) for eid in evaluator_ids))
        except (TypeError, ValueError):
            return False, "Los identificadores de evaluadores no son válidos."

        if not evaluated_ids.issubset(set(unique_ids)):
            return False, "No puedes quitar jurados que ya enviaron su evaluación."

        is_clearing_pending = set(unique_ids) == evaluated_ids
        if not is_clearing_pending and len(unique_ids) != 3:
            return False, "Debes seleccionar exactamente 3 jurados o limpiar los jurados pendientes."

        if article.author_id in unique_ids:
            return False, "Conflicto de interés: el autor del artículo no puede ser asignado como jurado."

        new_ids = [uid for uid in unique_ids if uid not in existing_ids]
        selected_users = list(
            User.objects.filter(
                id__in=unique_ids,
                roles__name__in=COMMITTEE_ROLE_NAMES,
                is_active=True,
            )
            .annotate(total_assigned_count=Count('article_reviews', distinct=True))
            .distinct()
        )
        if len(selected_users) != len(unique_ids):
            return False, "Todos los jurados seleccionados deben ser miembros activos del comité científico."

        for member in selected_users:
            if (member.email or '').strip().lower() in coauthor_emails:
                return False, f"Conflicto de interés: {member.get_full_name() or member.username} es coautor del artículo."
            if member.id in new_ids and member.total_assigned_count >= 3:
                return False, f"Cupo lleno: {member.get_full_name() or member.username} ya tiene 3 artículos asignados."

        target_ids = unique_ids

    newly_assigned_ids = [uid for uid in target_ids if uid not in existing_ids]

    with transaction.atomic():
        article.reviews.filter(is_approved__isnull=True).exclude(evaluator_id__in=target_ids).delete()
        for uid in newly_assigned_ids:
            ArticleReview.objects.create(article=article, evaluator_id=uid)

        if len(target_ids) == 0:
            if article.status == ArticleStatus.EN_REVISION:
                article.status = ArticleStatus.POSTULADO
                article.save(update_fields=['status'])
        elif article.status == ArticleStatus.POSTULADO:
            article.status = ArticleStatus.EN_REVISION
            article.save(update_fields=['status'])

    if newly_assigned_ids:
        _notify_assigned_evaluators(article, newly_assigned_ids)

    if len(target_ids) == len(evaluated_ids) and len(target_ids) < 3:
        return True, f"Se limpiaron los jurados pendientes del artículo '{article.title}'."
    return True, f"Se asignaron {len(target_ids)} jurado(s) exitosamente al artículo '{article.title}'."


def _notify_assigned_evaluators(article, evaluator_ids):
    """Envía un correo de notificación a cada evaluador recién asignado."""
    deadline = get_conference_deadlines()
    deadline_line = (
        f"Fecha límite de revisión: {deadline.reviews_deadline.strftime('%d/%m/%Y %H:%M')}\n"
        if deadline and deadline.reviews_deadline
        else ""
    )
    evaluators = User.objects.filter(id__in=evaluator_ids).exclude(email='')
    for member in evaluators:
        send_mail(
            subject=f'Nueva asignación de evaluación en SciConf: {article.title}',
            message=(
                f"Hola {member.first_name or member.username},\n\n"
                f"Has sido asignado como jurado evaluador del siguiente artículo en SciConf:\n\n"
                f"  • Título: {article.title}\n"
                f"  • Línea temática: {article.thematic_line}\n"
                f"{deadline_line}\n"
                f"Ingresa a SciConf en el módulo 'Versiones y revisiones' para revisar el PDF inicial y registrar tu evaluación.\n"
            ),
            from_email=None,
            recipient_list=[member.email],
            fail_silently=True,
        )


def suggest_evaluators_for_article(article, current_user=None):
    """
    Retorna los miembros activos del comité científico con su carga actual (X / 3),
    afinidad temática, conflicto de interés (autor/coautor) y estado de evaluación.
    """
    coauthor_emails = _get_article_conflict_emails(article)
    assigned_ids = list(article.reviews.values_list('evaluator_id', flat=True))
    evaluated_ids = list(
        article.reviews.filter(is_approved__isnull=False).values_list('evaluator_id', flat=True)
    )

    candidates_qs = (
        User.objects.filter(
            roles__name__in=COMMITTEE_ROLE_NAMES,
            is_active=True,
        )
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
        is_assigned = member.id in assigned_ids
        has_conflict = (member.id == article.author_id) or (
            (member.email or '').strip().lower() in coauthor_emails
        )
        is_full = (member.total_assigned_count >= 3) and not is_assigned
        candidates.append({
            'id': member.id,
            'username': member.username,
            'full_name': member.get_full_name() or member.username,
            'email': member.email,
            'thematic_reviews_count': member.thematic_reviews_count,
            'total_assigned_count': member.total_assigned_count,
            'is_current_user': bool(current_user and member.id == current_user.id),
            'has_conflict': has_conflict,
            'is_full': is_full,
            'has_evaluated': member.id in evaluated_ids,
        })

    # Priorizar elegibles (sin conflicto ni cupo lleno), luego afinidad temática y menor carga
    candidates.sort(
        key=lambda c: (
            c['has_conflict'] or c['is_full'],
            -c['thematic_reviews_count'],
            c['total_assigned_count'],
            c['full_name'].lower(),
        )
    )

    eligible_new_ids = [
        c['id'] for c in candidates
        if not c['has_conflict'] and not c['is_full'] and c['id'] not in evaluated_ids
    ]
    slots_needed = max(0, 3 - len(evaluated_ids))
    suggested_ids = evaluated_ids + eligible_new_ids[:slots_needed]
    if len(suggested_ids) < 3:
        suggested_ids = []

    return {
        'thematic_line': article.thematic_line,
        'suggested_ids': suggested_ids,
        'assigned_ids': assigned_ids,
        'evaluated_ids': evaluated_ids,
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
        
    # Verificar aval para publicación (basta 1 miembro del Comité Científico)
    elif article.status == ArticleStatus.FINAL_ENTREGADO:
        pub_endorsements = reviews.filter(publication_endorsement=True).count()
        if pub_endorsements >= 1:
            article.status = ArticleStatus.CON_AVAL_PUBLICACION
            article.save(update_fields=['status'])
            return True, "Artículo cuenta con aval para publicación."
    return False, "Aún no se alcanzan los avales necesarios."