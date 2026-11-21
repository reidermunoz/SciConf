import useAuth from '../../hooks/useAuth';

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

const VERSION_LABELS = {
    INICIAL: 'Propuesta inicial',
    CORREGIDA: 'Versión corregida para presentación',
    FINAL: 'Versión final para publicación',
};

const computeAverage = (o, r, t) => {
    if (!o || !r || !t) return null;
    return ((Number(o) + Number(r) + Number(t)) / 3).toFixed(1);
};

export default function ArticleDetailModal({ isOpen, onClose, article }) {
    const { user: currentUser, isAdmin, isCommittee } = useAuth();

    if (!isOpen || !article) return null;

    const canSeeReviewerNames = isAdmin || isCommittee;
    const statusInfo = STATUS_BADGE_MAP[article.status] || {
        label: article.status || 'POSTULADO',
        cls: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const keywordTags = (article.keywords || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

    const chronologicalVersions = [...(article.versions || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    const reviews = article.reviews || [];
    const currentUserReview = reviews.find((r) => r.evaluator === currentUser?.id);
    const hidePeerEvaluations =
        isCommittee &&
        !isAdmin &&
        Boolean(currentUserReview) &&
        currentUserReview.is_approved === null;

    const formattedDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl transition-all">

                {/* Cabecera */}
                <div className="mb-4 flex items-start justify-between border-b pb-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                {article.thematic_line}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.cls}`}>
                                {statusInfo.label}
                            </span>
                        </div>
                        <h3 className="mt-2 text-xl font-bold text-gray-800">{article.title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido / Detalles */}
                <div className="flex flex-col gap-4 text-sm text-gray-700 max-h-[70vh] overflow-y-auto pr-1">

                    {/* Autor principal */}
                    <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3.5 sm:grid-cols-3">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Autor principal</p>
                            <p className="font-semibold text-gray-800">{article.author_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Correo electrónico</p>
                            <p className="font-semibold text-gray-800 break-all">{article.author_email || 'No disponible'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Afiliación universitaria</p>
                            <p className="font-semibold text-gray-800">{article.author_institution || 'No especificada'}</p>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1">Resumen (Abstract):</p>
                        <p className="whitespace-pre-line text-gray-600 bg-gray-50/50 p-3.5 rounded-lg border border-gray-100 leading-relaxed">
                            {article.abstract}
                        </p>
                    </div>

                    {/* Palabras clave en chips */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1.5">Palabras clave:</p>
                        {keywordTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {keywordTags.map((tag, idx) => (
                                    <span
                                        key={`${tag}-${idx}`}
                                        className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Sin palabras clave registradas.</p>
                        )}
                    </div>

                    {/* Coautores */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1.5">Coautores:</p>
                        {article.coauthors && article.coauthors.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {article.coauthors.map((c, idx) => (
                                    <div key={c.id || idx} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-xs">
                                        <p className="font-semibold text-gray-800">{c.first_name} {c.last_name}</p>
                                        <p className="text-gray-600 font-medium mt-0.5">{c.university}</p>
                                        <p className="text-gray-500">{c.email}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Sin coautores registrados.</p>
                        )}
                    </div>

                    {/* Versiones cargadas (orden cronológico) */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1.5">Versiones cargadas:</p>
                        {chronologicalVersions.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {chronologicalVersions.map((ver) => (
                                    <div key={ver.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                                        <div>
                                            <span className="font-semibold text-gray-800">
                                                {VERSION_LABELS[ver.version_type] || ver.version_type}
                                            </span>
                                            <span className="ml-2 text-gray-400">{formattedDate(ver.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ver.file && (
                                                <a
                                                    href={ver.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded border border-brand-200 bg-white px-2.5 py-1 font-semibold text-brand-600 hover:bg-brand-50 transition"
                                                >
                                                    Ver / Descargar PDF
                                                </a>
                                            )}
                                            {ver.copyright_file && (
                                                <a
                                                    href={ver.copyright_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded border border-amber-200 bg-white px-2.5 py-1 font-semibold text-amber-700 hover:bg-amber-50 transition"
                                                >
                                                    Copyright
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Aún no se han cargado versiones para este artículo.</p>
                        )}
                    </div>

                    {/* Evaluaciones recibidas */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1.5">Evaluaciones recibidas:</p>
                        {reviews.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {reviews.map((rev, idx) => {
                                    const isPeerHidden =
                                        rev.is_hidden_until_own_vote ||
                                        (hidePeerEvaluations && rev.evaluator !== currentUser?.id);
                                    const hasEvaluated = rev.has_evaluated ?? rev.is_approved !== null;
                                    const avg = computeAverage(
                                        rev.originality_score,
                                        rev.relevance_score,
                                        rev.technical_quality_score
                                    );
                                    const label = canSeeReviewerNames
                                        ? rev.evaluator_name || `Evaluador ${idx + 1}`
                                        : `Evaluador ${idx + 1}`;

                                    return (
                                        <div key={rev.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="font-semibold text-gray-800">{label}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {!isPeerHidden && avg && (
                                                        <span className="rounded bg-white border border-gray-200 px-2 py-0.5 font-semibold text-gray-700">
                                                            Prom: {avg}/5
                                                        </span>
                                                    )}
                                                    {isPeerHidden ? (
                                                        <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-600">
                                                            {hasEvaluated ? 'Evaluado (oculto)' : 'Pendiente'}
                                                        </span>
                                                    ) : rev.is_approved === true ? (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                                                            Aprobado
                                                        </span>
                                                    ) : rev.is_approved === false ? (
                                                        <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                                                            Rechazado
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-600">
                                                            Pendiente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isPeerHidden ? (
                                                <p className="mt-1.5 text-[11px] text-gray-500">
                                                    🔒 Evaluación oculta hasta que envíes tu propia evaluación inicial.
                                                </p>
                                            ) : (
                                                <>
                                                    {rev.originality_score && (
                                                        <p className="mt-1 text-[11px] text-gray-500">
                                                            Originalidad: {rev.originality_score} · Pertinencia: {rev.relevance_score} · Calidad Técnica: {rev.technical_quality_score}
                                                        </p>
                                                    )}
                                                    {rev.comments && (
                                                        <p className="mt-1.5 italic text-gray-600">"{rev.comments}"</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Aún no tiene evaluaciones asignadas.</p>
                        )}
                    </div>

                    {/* Metadatos de fecha */}
                    <div className="grid grid-cols-2 gap-4 border-t pt-3 text-xs text-gray-500">
                        <div>
                            <span className="font-medium">Fecha de postulación:</span> {formattedDate(article.created_at)}
                        </div>
                        <div>
                            <span className="font-medium">Última modificación:</span> {formattedDate(article.updated_at)}
                        </div>
                    </div>
                </div>

                {/* Pie de modal */}
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
