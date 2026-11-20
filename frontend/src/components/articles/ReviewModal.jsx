import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { submitReviewEvaluation, endorsePresentation } from '../../api/articleApi';

const STATUS_BADGE_MAP = {
    POSTULADO: { label: 'POSTULADO', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
    EN_REVISION: { label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    ACEPTADO: { label: 'ACEPTADO', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    RECHAZADO: { label: 'RECHAZADO', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    CORRECCION_ENTREGADA: { label: 'CORRECCIÓN ENTREGADA', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    CON_AVAL_PRESENTACION: { label: 'CON AVAL PARA PRESENTACIÓN', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    FINAL_ENTREGADO: { label: 'VERSIÓN FINAL ENTREGADA', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    CON_AVAL_PUBLICACION: { label: 'CON AVAL PARA PUBLICACIÓN', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const CRITERIA = [
    { key: 'originality_score', label: 'Originalidad' },
    { key: 'relevance_score', label: 'Pertinencia' },
    { key: 'technical_quality_score', label: 'Calidad Técnica' },
];

const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha configurada';
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const computeAverage = (o, r, t) => {
    if (!o || !r || !t) return null;
    return ((Number(o) + Number(r) + Number(t)) / 3).toFixed(1);
};

export default function ReviewModal({ isOpen, onClose, review, deadlines = null, onSuccess }) {
    const [scores, setScores] = useState({
        originality_score: 0,
        relevance_score: 0,
        technical_quality_score: 0,
    });
    const [comments, setComments] = useState('');
    const [showContext, setShowContext] = useState(false);
    const [submittingEval, setSubmittingEval] = useState(false);
    const [submittingEndorse, setSubmittingEndorse] = useState(false);
    const [currentReview, setCurrentReview] = useState(review);

    useEffect(() => {
        setCurrentReview(review);
        setScores({
            originality_score: review?.originality_score || 0,
            relevance_score: review?.relevance_score || 0,
            technical_quality_score: review?.technical_quality_score || 0,
        });
        setComments(review?.comments || '');
        setShowContext(false);
    }, [review, isOpen]);

    if (!isOpen || !currentReview) return null;

    const articleVersions = currentReview.article_versions || [];
    const initialVersion = articleVersions.find((v) => v.version_type === 'INICIAL');
    const correctedVersion = articleVersions.find((v) => v.version_type === 'CORREGIDA');

    const articleStatus = currentReview.article_status || 'EN_REVISION';
    const statusInfo = STATUS_BADGE_MAP[articleStatus] || {
        label: articleStatus.replace(/_/g, ' '),
        cls: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const activeDeadline = (() => {
        if (!deadlines) return null;
        if (['POSTULADO', 'EN_REVISION'].includes(articleStatus)) {
            return { label: 'Límite revisión', date: deadlines.reviews_deadline };
        }
        if (['ACEPTADO', 'CORRECCION_ENTREGADA'].includes(articleStatus)) {
            return { label: 'Límite correcciones', date: deadlines.corrections_deadline };
        }
        return { label: 'Límite entrega final', date: deadlines.final_deadline };
    })();

    const hasEvaluated = currentReview.is_approved !== null && currentReview.is_approved !== undefined;
    const averageScore = computeAverage(
        scores.originality_score,
        scores.relevance_score,
        scores.technical_quality_score
    );

    const canEndorsePresentation =
        ['ACEPTADO', 'CORRECCION_ENTREGADA', 'CON_AVAL_PRESENTACION'].includes(articleStatus) &&
        Boolean(correctedVersion);

    const hasPresentationDecision =
        currentReview.presentation_decision !== null && currentReview.presentation_decision !== undefined;
    const presentationApproved =
        hasPresentationDecision ? currentReview.presentation_decision : currentReview.presentation_endorsement;

    const endorsementsCount = currentReview.presentation_endorsements_count ?? (currentReview.presentation_endorsement ? 1 : 0);
    const peerReviews = currentReview.other_reviews || [];

    // Enviar evaluación inicial (Aceptar / Rechazar)
    const handleSubmitDecision = async (isApproved) => {
        if (!scores.originality_score || !scores.relevance_score || !scores.technical_quality_score) {
            toast.error('Debes calificar Originalidad, Pertinencia y Calidad Técnica (1 a 5).');
            return;
        }
        if (!comments.trim()) {
            toast.error('Debes ingresar comentarios u observaciones para el autor.');
            return;
        }
        const actionLabel = isApproved ? 'ACEPTAR' : 'RECHAZAR';
        if (!window.confirm(`¿Confirmas que deseas ${actionLabel} este artículo? Tu voto es definitivo.`)) {
            return;
        }

        setSubmittingEval(true);
        try {
            const res = await submitReviewEvaluation(currentReview.id, {
                comments: comments.trim(),
                is_approved: isApproved,
                originality_score: scores.originality_score,
                relevance_score: scores.relevance_score,
                technical_quality_score: scores.technical_quality_score,
            });
            toast.success(res.data.message || 'Evaluación registrada exitosamente');
            if (res.data.review) {
                setCurrentReview(res.data.review);
            }
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al guardar la evaluación');
        } finally {
            setSubmittingEval(false);
        }
    };

    // Aval para presentación (Emitir Aval / No Avalar Corrección)
    const handlePresentationDecision = async (approved) => {
        const confirmMsg = approved
            ? '¿Confirmas emitir el Aval para Presentación de este artículo?'
            : '¿Confirmas registrar que NO avalas la corrección de este artículo?';
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setSubmittingEndorse(true);
        try {
            const res = await endorsePresentation(currentReview.id, approved);
            toast.success(
                res.data?.message ||
                    (approved ? 'Aval para presentación emitido correctamente' : 'Decisión registrada: corrección no avalada')
            );
            if (res.data?.review) {
                setCurrentReview(res.data.review);
            }
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al registrar la decisión de aval');
        } finally {
            setSubmittingEndorse(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl transition-all max-h-[90vh] overflow-y-auto">

                {/* 1. Cabecera con Contexto del Artículo */}
                <div className="mb-4 border-b border-gray-200 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                Evaluación de Artículo como Jurado
                            </span>
                            <h3 className="mt-1.5 text-xl font-bold text-gray-800">
                                {currentReview.article_title}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Badges de contexto */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.cls}`}>
                            {statusInfo.label}
                        </span>
                        {currentReview.article_thematic_line && (
                            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700">
                                {currentReview.article_thematic_line}
                            </span>
                        )}
                        {activeDeadline?.date && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                                ⏳ {activeDeadline.label}: {formatDate(activeDeadline.date)}
                            </span>
                        )}
                    </div>

                    {/* Acordeón colapsable: Resumen y Palabras clave */}
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/70">
                        <button
                            type="button"
                            onClick={() => setShowContext((prev) => !prev)}
                            className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100/70 rounded-xl transition"
                        >
                            <span>Resumen (Abstract) y Palabras clave</span>
                            <span className="text-gray-400">{showContext ? '▲' : '▼'}</span>
                        </button>
                        {showContext && (
                            <div className="border-t border-gray-200 px-3.5 py-3 text-xs text-gray-600 space-y-2">
                                <div>
                                    <p className="font-semibold text-gray-700 mb-0.5">Resumen:</p>
                                    <p className="whitespace-pre-line leading-relaxed">
                                        {currentReview.article_abstract || 'Sin resumen registrado.'}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-0.5">Palabras clave:</p>
                                    <p>{currentReview.article_keywords || 'Sin palabras clave registradas.'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-5 text-sm">

                    {/* Sección 1: Evaluación Inicial */}
                    <div className="rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-gray-800">1. Evaluación Inicial</h4>
                            {hasEvaluated && (
                                <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        currentReview.is_approved
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-rose-100 text-rose-800'
                                    }`}
                                >
                                    {currentReview.is_approved ? '✓ Aprobado' : '✕ Rechazado'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            Revisa la propuesta inicial, califica la rúbrica (1 a 5) y registra tus observaciones técnicas.
                        </p>

                        {/* PDF de Propuesta Inicial */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                            <div>
                                <p className="text-xs font-semibold text-gray-800">Propuesta Inicial (PDF)</p>
                                <p className="text-[11px] text-gray-500">
                                    {initialVersion
                                        ? `Subido el ${formatDate(initialVersion.created_at)}`
                                        : 'El autor aún no ha subido el PDF inicial'}
                                </p>
                            </div>
                            {initialVersion?.file && (
                                <a
                                    href={initialVersion.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                                >
                                    📄 Ver / Descargar PDF de Propuesta Inicial
                                </a>
                            )}
                        </div>

                        {/* Rúbrica por Criterios (1 a 5) */}
                        <div className="mb-4 rounded-xl border border-gray-200 bg-slate-50/60 p-3.5">
                            <div className="mb-2.5 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                                    Calificación por Criterios (1 a 5)
                                </span>
                                <span className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                                    Promedio: {averageScore ? `${averageScore} / 5.0` : '—'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                {CRITERIA.map(({ key, label }) => (
                                    <div key={key} className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-gray-700">{label}</span>
                                        <div className="flex items-center gap-1.5">
                                            {[1, 2, 3, 4, 5].map((num) => {
                                                const active = scores[key] === num;
                                                return (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        disabled={hasEvaluated || submittingEval}
                                                        onClick={() => setScores((prev) => ({ ...prev, [key]: num }))}
                                                        className={`size-8 rounded-lg border text-xs font-semibold transition ${
                                                            active
                                                                ? 'border-brand-500 bg-brand-500 text-white shadow-xs'
                                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                                        } ${hasEvaluated ? 'cursor-default opacity-80' : ''}`}
                                                    >
                                                        {num}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comentarios */}
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Comentarios u observaciones para el autor <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={4}
                            value={comments}
                            disabled={hasEvaluated || submittingEval}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Escribe aquí los comentarios detallados..."
                            className={`w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                                hasEvaluated ? 'bg-gray-50 text-gray-700 cursor-default' : 'bg-white'
                            }`}
                        />

                        {/* Botones de decisión o estado en solo lectura */}
                        {!hasEvaluated ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={submittingEval}
                                    onClick={() => handleSubmitDecision(true)}
                                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
                                >
                                    {submittingEval ? 'Guardando...' : '✓ Aceptar Artículo'}
                                </button>
                                <button
                                    type="button"
                                    disabled={submittingEval}
                                    onClick={() => handleSubmitDecision(false)}
                                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                                >
                                    {submittingEval ? 'Guardando...' : '✕ Rechazar Artículo'}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                        Evaluaciones de los otros jurados
                                    </h5>
                                    <span className="text-[11px] text-gray-400">
                                        Desbloqueado tras enviar tu evaluación
                                    </span>
                                </div>
                                {peerReviews.length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                        Los demás jurados aún no han enviado su evaluación inicial.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {peerReviews.map((peer) => {
                                            const peerAvg = computeAverage(
                                                peer.originality_score,
                                                peer.relevance_score,
                                                peer.technical_quality_score
                                            );
                                            return (
                                                <div key={peer.id} className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                        <span className="font-semibold text-gray-800">
                                                            {peer.evaluator_name}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {peerAvg && (
                                                                <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                                                                    Prom: {peerAvg}/5
                                                                </span>
                                                            )}
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 font-semibold ${
                                                                    peer.is_approved
                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                        : 'bg-rose-100 text-rose-700'
                                                                }`}
                                                            >
                                                                {peer.is_approved ? '✓ Aprobado' : '✕ Rechazado'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {peer.originality_score && (
                                                        <p className="text-[11px] text-gray-500 mb-1">
                                                            Originalidad: {peer.originality_score} · Pertinencia: {peer.relevance_score} · Calidad Técnica: {peer.technical_quality_score}
                                                        </p>
                                                    )}
                                                    <p className="italic text-gray-600">"{peer.comments}"</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sección 2: Avales (Alcance Pre-Agenda) */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">2. Avales (Alcance Pre-Agenda)</h4>
                        <div className="flex flex-col gap-3">

                            {/* Tarjeta A - Aval para Presentación (Funcional) */}
                            <div className="rounded-lg bg-white p-3.5 border border-gray-200">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium text-gray-800">Aval para Presentación</p>
                                        <p className="text-xs text-gray-500">
                                            Verificar que el autor corrigió las observaciones en su versión corregida.
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">
                                        {endorsementsCount} / 3 avales (req. 2)
                                    </span>
                                </div>

                                {!canEndorsePresentation ? (
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                                        <span>🔒</span>
                                        <span>
                                            Disponible cuando el artículo sea ACEPTADO y el autor suba su versión corregida
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mt-3 flex flex-col gap-3">
                                        {/* Descargar PDF Versión Corregida */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                            <span className="text-[11px] text-gray-500">
                                                Versión corregida subida el {formatDate(correctedVersion.created_at)}
                                            </span>
                                            {correctedVersion.file && (
                                                <a
                                                    href={correctedVersion.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-md bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                                                >
                                                    📥 Descargar PDF Versión Corregida
                                                </a>
                                            )}
                                        </div>

                                        {hasPresentationDecision || currentReview.presentation_endorsement ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Tu decisión registrada:</span>
                                                <span
                                                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                                                        presentationApproved
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-rose-100 text-rose-800'
                                                    }`}
                                                >
                                                    {presentationApproved ? '✓ Aval emitido' : '✕ Corrección no avalada'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    disabled={submittingEndorse}
                                                    onClick={() => handlePresentationDecision(true)}
                                                    className="flex-1 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition disabled:opacity-50"
                                                >
                                                    {submittingEndorse ? 'Guardando...' : '✓ Emitir Aval'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={submittingEndorse}
                                                    onClick={() => handlePresentationDecision(false)}
                                                    className="flex-1 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                                                >
                                                    {submittingEndorse ? 'Guardando...' : '✕ No Avalar Corrección'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tarjeta B - Aval para Publicación (Placeholder bloqueado por ahora) */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-100/80 p-3.5 border border-gray-200 opacity-75">
                                <div>
                                    <p className="font-medium text-gray-700 flex items-center gap-1.5">
                                        <span>🔒</span>
                                        <span>Aval para Publicación</span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Fase post-evento: disponible después de la presentación en la agenda
                                    </p>
                                </div>
                                <span className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-500 cursor-not-allowed">
                                    Bloqueado
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pie */}
                <div className="mt-5 flex justify-end border-t pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
