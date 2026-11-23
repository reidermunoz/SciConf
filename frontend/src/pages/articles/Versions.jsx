import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { getArticles, getMyReviews, getDeadlines } from '../../api/articleApi';
import UploadVersionModal from '../../components/articles/UploadVersionModal';
import ReviewModal from '../../components/articles/ReviewModal';
import AssignEvaluatorsModal from '../../components/articles/AssignEvaluatorsModal';
import DeadlinesConfigModal from '../../components/articles/DeadlinesConfigModal';

const STATUS_BADGE_MAP = {
    POSTULADO: { label: 'POSTULADO', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
    EN_REVISION: { label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    ACEPTADO: { label: 'ACEPTADO', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    RECHAZADO: { label: 'RECHAZADO', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    CORRECCION_ENTREGADA: { label: 'Corrección entregada', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    CON_AVAL_PRESENTACION: { label: 'CON AVAL PARA PRESENTACIÓN', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    FINAL_ENTREGADO: { label: 'VERSIÓN FINAL ENTREGADA', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    CON_AVAL_PUBLICACION: { label: 'CON AVAL PARA PUBLICACIÓN', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const getActivePhaseDeadline = (articleStatus, deadlines, isAuthorView = false) => {
    if (!deadlines) return null;
    if (isAuthorView && articleStatus === 'POSTULADO') {
        return { label: 'Límite postulación', date: deadlines.submissions_deadline };
    }
    if (['POSTULADO', 'EN_REVISION'].includes(articleStatus)) {
        return { label: 'Límite revisión', date: deadlines.reviews_deadline };
    }
    if (['ACEPTADO', 'CORRECCION_ENTREGADA'].includes(articleStatus)) {
        return { label: 'Límite correcciones', date: deadlines.corrections_deadline };
    }
    return { label: 'Límite final', date: deadlines.final_deadline };
};

const computeAverage = (o, r, t) => {
    if (!o || !r || !t) return null;
    return ((Number(o) + Number(r) + Number(t)) / 3).toFixed(1);
};

export default function Versions() {

    const { user: currentUser, isAdmin, isCommittee, isAuthor } = useAuth();

    // Pestaña activa ('my-articles' o 'my-reviews')
    const [activeTab, setActiveTab] = useState(isCommittee && !isAuthor ? 'my-reviews' : 'my-articles');

    // Datos
    const [myArticles, setMyArticles] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    const [deadlines, setDeadlines] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filtros y estado de supervisión (Admin)
    const [adminSearch, setAdminSearch] = useState('');
    const [adminStatusFilter, setAdminStatusFilter] = useState('');
    const [expandedReviewsMap, setExpandedReviewsMap] = useState({});

    // Modales
    const [selectedArticleForUpload, setSelectedArticleForUpload] = useState(null);
    const [uploadFixedType, setUploadFixedType] = useState(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedArticleForAssign, setSelectedArticleForAssign] = useState(null);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isDeadlinesOpen, setIsDeadlinesOpen] = useState(false);

    // Cargar datos en paralelo para reducir el tiempo total de espera
    const fetchData = useCallback(async (isManual = false) => {
        setLoading(true);

        try {
            const tasks = [
                getDeadlines()
                    .then((deadRes) => setDeadlines(deadRes.data))
                    .catch(() => {
                        // Silencioso si aún no se configuran
                    }),
            ];

            if (isAuthor || isAdmin) {
                tasks.push(
                    getArticles().then((artRes) => {
                        const filtered = isAdmin
                            ? artRes.data
                            : artRes.data.filter(
                                  (a) =>
                                      a.author === currentUser?.id ||
                                      (a.coauthors || []).some(
                                          (c) =>
                                              c.email &&
                                              currentUser?.email &&
                                              c.email.toLowerCase() === currentUser.email.toLowerCase()
                                      )
                              );
                        setMyArticles(filtered);
                    })
                );
            }

            if (isCommittee) {
                tasks.push(
                    getMyReviews().then((revRes) => {
                        setMyReviews(revRes.data);
                    })
                );
            }

            await Promise.all(tasks);

            if (isManual) {
                toast.success('Versiones y revisiones actualizadas');
            }
        } catch {
            toast.error('Error al cargar la información de versiones y revisiones');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, isAdmin, isCommittee, isAuthor]);
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleAdminReviews = (articleId) => {
        setExpandedReviewsMap((prev) => ({ ...prev, [articleId]: !prev[articleId] }));
    };

    const displayedArticles = isAdmin
        ? myArticles.filter((art) => {
              const matchesSearch =
                  !adminSearch.trim() ||
                  (art.title || '').toLowerCase().includes(adminSearch.trim().toLowerCase());
              const matchesStatus = !adminStatusFilter || art.status === adminStatusFilter;
              return matchesSearch && matchesStatus;
          })
        : myArticles;

    return (
        <div className="flex flex-col gap-6">
            
            {/* Cabecera */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Versiones y Revisiones</h2>
                    <p className="text-sm text-gray-500">
                        Gestión del ciclo de vida de los artículos: propuestas, evaluaciones, correcciones y avales.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:text-brand-600 transition disabled:opacity-60"
                        title="Actualizar datos desde la base de datos"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`size-4 ${loading ? 'animate-spin text-brand-600' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span>Actualizar</span>
                    </button>
                    {(isAdmin || isCommittee) && (
                        <button
                            type="button"
                            onClick={() => setIsDeadlinesOpen(true)}
                            className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition"
                        >
                            ⚙️ Plazos y Copyright
                        </button>
                    )}
                </div>
            </div>
            
            {/* Selector de pestañas */}
            <div className="flex border-b border-gray-200">
                {(isAuthor || isAdmin) && (
                    <button
                        onClick={() => setActiveTab('my-articles')}
                        className={`border-b-2 px-5 py-3 text-sm font-medium transition ${
                            activeTab === 'my-articles'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        📄 Artículos y Versiones ({displayedArticles.length})
                    </button>
                )}
                {isCommittee && (
                    <button
                        onClick={() => setActiveTab('my-reviews')}
                        className={`border-b-2 px-5 py-3 text-sm font-medium transition ${
                            activeTab === 'my-reviews'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        ⚖️ Mis Revisiones Asignadas ({myReviews.length} / 3)
                    </button>
                )}
            </div>
            
            {/* Contenido según pestaña */}
            {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                    Cargando información...
                </div>
            ) : activeTab === 'my-articles' ? (

                /* TAB 1: Artículos (Autor o Supervisión Global Admin) */
                <div className="flex flex-col gap-4">
                    {isAdmin && (
                        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-600">Buscar por título</label>
                                <input
                                    type="search"
                                    value={adminSearch}
                                    onChange={(e) => setAdminSearch(e.target.value)}
                                    placeholder="Buscar artículo por título..."
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-600">Estado del artículo</label>
                                <select
                                    value={adminStatusFilter}
                                    onChange={(e) => setAdminStatusFilter(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                >
                                    <option value="">Todos</option>
                                    <option value="POSTULADO">POSTULADO</option>
                                    <option value="EN_REVISION">EN REVISIÓN</option>
                                    <option value="ACEPTADO">ACEPTADO</option>
                                    <option value="RECHAZADO">RECHAZADO</option>
                                    <option value="CON_AVAL_PRESENTACION">CON AVAL PARA PRESENTACIÓN</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {displayedArticles.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                            <p className="text-gray-600 font-medium">
                                {isAdmin ? 'No se encontraron artículos con los filtros seleccionados.' : 'No tienes artículos postulados.'}
                            </p>
                            {!isAdmin && (
                                <p className="text-xs text-gray-400 mt-1">Crea un artículo en el módulo de Artículos para comenzar.</p>
                            )}
                        </div>
                    ) : (
                        displayedArticles.map((art) => {
                            const statusInfo = STATUS_BADGE_MAP[art.status] || {
                                label: art.status || 'POSTULADO',
                                cls: 'bg-gray-100 text-gray-700 border-gray-200',
                            };
                            const phaseDeadline = getActivePhaseDeadline(art.status, deadlines, !isAdmin);
                            const isPrincipalAuthor = art.author === currentUser?.id;
                            const isSubmissionOpen =
                                !deadlines?.submissions_deadline ||
                                new Date() <= new Date(deadlines.submissions_deadline);
                            const isCorrectionOpen =
                                !deadlines?.corrections_deadline ||
                                new Date() <= new Date(deadlines.corrections_deadline);
                            const isFinalOpen =
                                !deadlines?.final_deadline ||
                                new Date() <= new Date(deadlines.final_deadline);

                            const uploadConfig = (() => {
                                if (isAdmin) return null;
                                if (art.status === 'POSTULADO') {
                                    return {
                                        label: '📤 Reemplazar PDF Inicial',
                                        fixedType: 'INICIAL',
                                        enabled: isPrincipalAuthor && isSubmissionOpen,
                                        title: !isPrincipalAuthor
                                            ? `Solo el autor principal (${art.author_name}) puede subir versiones`
                                            : !isSubmissionOpen
                                            ? 'El plazo de postulaciones ha finalizado'
                                            : 'Reemplazar propuesta inicial (PDF)',
                                    };
                                }
                                if (art.status === 'ACEPTADO') {
                                    return {
                                        label: '📤 Subir Versión Corregida',
                                        fixedType: 'CORREGIDA',
                                        enabled: isPrincipalAuthor && isCorrectionOpen,
                                        title: !isPrincipalAuthor
                                            ? `Solo el autor principal (${art.author_name}) puede subir versiones`
                                            : !isCorrectionOpen
                                            ? 'El plazo de entrega de correcciones ha finalizado'
                                            : 'Subir versión corregida para presentación (PDF)',
                                    };
                                }
                                if (art.status === 'CON_AVAL_PRESENTACION') {
                                    return {
                                        label: '📤 Subir Versión Final y Copyright',
                                        fixedType: 'FINAL',
                                        enabled: isPrincipalAuthor && isFinalOpen,
                                        title: !isPrincipalAuthor
                                            ? `Solo el autor principal (${art.author_name}) puede subir versiones`
                                            : !isFinalOpen
                                            ? 'El plazo de entrega final ha finalizado'
                                            : 'Subir versión final y cesión de copyright (PDF)',
                                    };
                                }
                                return null;
                            })();

                            const chronologicalVersions = [...(art.versions || [])].sort(
                                (a, b) => new Date(a.created_at) - new Date(b.created_at)
                            );

                            const reviews = art.reviews || [];
                            const endorsementsCount = reviews.filter((r) => r.presentation_endorsement).length;
                            const pubEndorsementsCount = reviews.some((r) => r.publication_endorsement) ? 1 : 0;
                            const evaluatedReviews = reviews.filter(
                                (r) => r.is_approved !== null || r.comments
                            );
                            const isExpanded = Boolean(expandedReviewsMap[art.id]);

                            return (
                                <div key={art.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                    {art.thematic_line}
                                                </span>
                                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.cls}`}>
                                                    {statusInfo.label}
                                                </span>
                                                {phaseDeadline?.date && (
                                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                                                        📅 {phaseDeadline.label}: {new Date(phaseDeadline.date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="mt-1.5 text-lg font-bold text-gray-800">{art.title}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Autor principal: <span className="font-medium text-gray-700">{art.author_name}</span>
                                            </p>

                                            {/* Coautores si existen */}
                                            {art.coauthors && art.coauthors.length > 0 && (
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                                    <span className="font-medium text-gray-600">Coautores:</span>
                                                    {art.coauthors.map((c, idx) => (
                                                        <span
                                                            key={c.id || idx}
                                                            className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700"
                                                        >
                                                            {c.first_name} {c.last_name} ({c.university})
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón en esquina superior derecha: Asignar / Ver Jurados (Admin) o Subir versión (Autor) */}
                                        {isAdmin ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedArticleForAssign(art);
                                                    setIsAssignOpen(true);
                                                }}
                                                className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                                            >
                                                👥 Asignar / Ver Jurados ({reviews.length}/3)
                                            </button>
                                        ) : uploadConfig && (
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setSelectedArticleForUpload(art);
                                                        setUploadFixedType(uploadConfig.fixedType);
                                                        setIsUploadOpen(true);
                                                    }}
                                                    disabled={!uploadConfig.enabled}
                                                    title={uploadConfig.title}
                                                    className="rounded-lg bg-brand-50 border border-brand-200 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {uploadConfig.label}
                                                </button>
                                                {!isPrincipalAuthor && (
                                                    <span className="text-[11px] text-amber-700">
                                                        Autor responsable: {art.author_name}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progreso hacia aval de presentación cuando entregó corrección */}
                                    {art.status === 'CORRECCION_ENTREGADA' && (
                                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                                            ⏳ <strong>Corrección entregada:</strong> en verificación del comité ({endorsementsCount} de 3 avales recibidos; se requieren 2 de 3 para obtener el aval de presentación).
                                        </div>
                                    )}

                                    {/* Versiones entregadas */}
                                    <div className="mt-4 border-t pt-3">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                            Versiones entregadas:
                                        </h4>
                                        {chronologicalVersions.length > 0 ? (
                                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {chronologicalVersions.map((ver) => (
                                                    <div key={ver.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 border border-gray-100 text-xs">
                                                        <div>
                                                            <p className="font-semibold text-gray-700">{ver.version_type}</p>
                                                            <p className="text-gray-400">{new Date(ver.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="flex gap-1.5">
                                                            {ver.file && (
                                                                <a
                                                                    href={ver.file}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="rounded bg-white px-2 py-1 font-medium text-brand-600 border border-gray-200 hover:bg-brand-50"
                                                                >
                                                                    PDF
                                                                </a>
                                                            )}
                                                            {ver.copyright_file && (
                                                                <a
                                                                    href={ver.copyright_file}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="rounded bg-white px-2 py-1 font-medium text-amber-700 border border-amber-200 hover:bg-amber-50"
                                                                >
                                                                    Copyright
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                                {isAdmin
                                                    ? '⚠️ El autor aún no ha subido el PDF de la propuesta inicial.'
                                                    : '⚠️ Aún no has subido el PDF de la propuesta inicial para este artículo.'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Supervisión de Jurados, Evaluaciones y Avales (Solo Administrador) */}
                                    {isAdmin && (
                                        <div className="mt-4 border-t pt-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Estado de Revisión y Avales
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                                                        Avales de Presentación: {endorsementsCount}/3
                                                    </span>
                                                    <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-700">
                                                        Aval de Publicación: {pubEndorsementsCount}/1
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Jurados asignados */}
                                            {reviews.length > 0 ? (
                                                <div className="grid gap-2 sm:grid-cols-3">
                                                    {reviews.map((r) => (
                                                        <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                                                            <span className="font-medium text-gray-800 truncate mr-2">
                                                                {r.evaluator_name}
                                                            </span>
                                                            {r.is_approved !== null ? (
                                                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                                    Evaluado
                                                                </span>
                                                            ) : (
                                                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400">Sin jurados asignados aún.</p>
                                            )}

                                            {/* Resumen desplegable de evaluaciones recibidas */}
                                            {evaluatedReviews.length > 0 && (
                                                <div className="mt-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAdminReviews(art.id)}
                                                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                                                    >
                                                        {isExpanded
                                                            ? `▲ Ocultar evaluaciones recibidas (${evaluatedReviews.length})`
                                                            : `▼ Ver evaluaciones recibidas (${evaluatedReviews.length})`}
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="mt-2 flex flex-col gap-2">
                                                            {evaluatedReviews.map((r) => {
                                                                const avg = computeAverage(
                                                                    r.originality_score,
                                                                    r.relevance_score,
                                                                    r.technical_quality_score
                                                                );
                                                                return (
                                                                    <div key={r.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs">
                                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                                            <span className="font-semibold text-gray-800">
                                                                                {r.evaluator_name}
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                {avg && (
                                                                                    <span className="rounded bg-white border border-gray-200 px-2 py-0.5 font-semibold text-gray-700">
                                                                                        Prom: {avg}/5
                                                                                    </span>
                                                                                )}
                                                                                {r.is_approved === true ? (
                                                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                                                                        ✓ Aceptado
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                                                                                        ✕ Rechazado
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {r.originality_score && (
                                                                            <p className="text-[11px] text-gray-500 mb-1">
                                                                                Originalidad: <strong>{r.originality_score}</strong> · Pertinencia: <strong>{r.relevance_score}</strong> · Calidad Técnica: <strong>{r.technical_quality_score}</strong>
                                                                            </p>
                                                                        )}
                                                                        {r.comments && (
                                                                            <p className="italic text-gray-600">"{r.comments}"</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Retroalimentación del Comité Científico (solo vista Autor, anónima) */}
                                    {!isAdmin && evaluatedReviews.length > 0 && (
                                        <div className="mt-4 border-t pt-3">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                Retroalimentación del Comité Científico:
                                            </h4>
                                            <div className="flex flex-col gap-2">
                                                {evaluatedReviews.map((r, idx) => {
                                                    const avg = computeAverage(
                                                        r.originality_score,
                                                        r.relevance_score,
                                                        r.technical_quality_score
                                                    );
                                                    return (
                                                        <div key={r.id} className="rounded-xl bg-gray-50/80 p-3 border border-gray-100 text-xs">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                                <span className="font-semibold text-gray-800">
                                                                    Evaluador {idx + 1}
                                                                </span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {avg && (
                                                                        <span className="rounded bg-white border border-gray-200 px-2 py-0.5 font-semibold text-gray-700">
                                                                            Prom: {avg}/5
                                                                        </span>
                                                                    )}
                                                                    {r.is_approved === true ? (
                                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                                                            ✓ Aceptado
                                                                        </span>
                                                                    ) : r.is_approved === false ? (
                                                                        <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                                                                            ✕ Rechazado
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                            {r.originality_score && (
                                                                <p className="text-[11px] text-gray-500 mb-1">
                                                                    Originalidad: <strong>{r.originality_score}</strong> · Pertinencia: <strong>{r.relevance_score}</strong> · Calidad Técnica: <strong>{r.technical_quality_score}</strong>
                                                                </p>
                                                            )}
                                                            {r.comments && (
                                                                <p className="text-gray-600 italic">"{r.comments}"</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                
                /* TAB 2: Revisiones Asignadas (Miembro Comité) */
                <div className="flex flex-col gap-4">
                    {myReviews.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                            <p className="text-gray-600 font-medium">No tienes artículos asignados para revisar.</p>
                            <p className="text-xs text-gray-400 mt-1">Los artículos serán asignados automáticamente al cerrar las postulaciones.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {myReviews.map((rev) => {
                                const articleStatus = rev.article_status || 'EN_REVISION';
                                const statusInfo = STATUS_BADGE_MAP[articleStatus] || {
                                    label: articleStatus.replace(/_/g, ' '),
                                    cls: 'bg-gray-100 text-gray-700 border-gray-200',
                                };
                                const phaseDeadline = getActivePhaseDeadline(articleStatus, deadlines);
                                const msLeft = phaseDeadline?.date ? new Date(phaseDeadline.date) - new Date() : null;
                                const isExpired = msLeft !== null && msLeft < 0;
                                const isExpiringSoon = msLeft !== null && msLeft >= 0 && msLeft <= 3 * 24 * 60 * 60 * 1000;

                                const hasCorrectedVersion = (rev.article_versions || []).some(
                                    (v) => v.version_type === 'CORREGIDA'
                                );
                                const hasPresentationVote =
                                    (rev.presentation_decision !== null && rev.presentation_decision !== undefined) ||
                                    rev.presentation_endorsement;

                                const needsInitialEval = rev.is_approved === null;
                                const needsPresentationReview =
                                    !needsInitialEval &&
                                    ['ACEPTADO', 'CORRECCION_ENTREGADA'].includes(articleStatus) &&
                                    hasCorrectedVersion &&
                                    !hasPresentationVote;

                                const actionButton = needsInitialEval
                                    ? {
                                          label: '📝 Realizar Evaluación',
                                          cls: 'bg-brand-500 text-white hover:bg-brand-600 shadow-xs',
                                      }
                                    : needsPresentationReview
                                    ? {
                                          label: '📥 Revisar Versión Corregida',
                                          cls: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs',
                                      }
                                    : {
                                          label: '👁️ Ver Detalles y Evaluaciones',
                                          cls: 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100',
                                      };

                                return (
                                    <div key={rev.id} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                                        <div>
                                            {/* Línea temática y fecha límite */}
                                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                {rev.article_thematic_line ? (
                                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                                                        {rev.article_thematic_line}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-gray-400">Revisión #{rev.id}</span>
                                                )}
                                                {phaseDeadline?.date && (
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                            isExpired
                                                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                                : isExpiringSoon
                                                                ? 'border-amber-300 bg-amber-50 text-amber-800 animate-pulse'
                                                                : 'border-gray-200 bg-gray-50 text-gray-600'
                                                        }`}
                                                        title={`${phaseDeadline.label}: ${new Date(phaseDeadline.date).toLocaleString()}`}
                                                    >
                                                        {isExpired ? '⚠️ Vencida' : isExpiringSoon ? '⏳ Vence pronto: ' : '📅 '}
                                                        {!isExpired && new Date(phaseDeadline.date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-2.5 text-base font-bold text-gray-800 line-clamp-2">
                                                {rev.article_title}
                                            </h3>

                                            {/* Estado global del artículo */}
                                            <div className="mt-2.5 flex items-center gap-2">
                                                <span className="text-[11px] font-medium text-gray-500">Estado del artículo:</span>
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.cls}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>

                                            {/* Acciones del jurado separadas */}
                                            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 flex flex-col gap-1.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600">Evaluación inicial:</span>
                                                    {rev.is_approved === true ? (
                                                        <span className="font-semibold text-emerald-700">✓ Aprobado</span>
                                                    ) : rev.is_approved === false ? (
                                                        <span className="font-semibold text-rose-700">✕ Rechazado</span>
                                                    ) : (
                                                        <span className="font-semibold text-amber-700">Pendiente</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600">Aval Presentación:</span>
                                                    {rev.presentation_decision === false ? (
                                                        <span className="font-semibold text-rose-700">No avalado</span>
                                                    ) : hasPresentationVote ? (
                                                        <span className="font-semibold text-emerald-700">✓ Emitido</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-medium">Pendiente</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600">Aval Publicación:</span>
                                                    {rev.publication_endorsement ? (
                                                        <span className="font-semibold text-emerald-700">✓ Emitido</span>
                                                    ) : (
                                                        <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                                                            Post-evento
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setSelectedReview(rev);
                                                setIsReviewOpen(true);
                                            }}
                                            className={`mt-4 w-full rounded-lg py-2 text-xs font-semibold transition ${actionButton.cls}`}
                                        >
                                            {actionButton.label}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            
            {/* Modal de subida de versión */}
            <UploadVersionModal
                isOpen={isUploadOpen}
                onClose={() => {
                    setIsUploadOpen(false);
                    setSelectedArticleForUpload(null);
                    setUploadFixedType(null);
                }}
                article={selectedArticleForUpload}
                fixedVersionType={uploadFixedType}
                deadlines={deadlines}
                onSuccess={fetchData}
            />

            {/* Modal de configuración de plazos y copyright (Admin / Comité) */}
            <DeadlinesConfigModal
                isOpen={isDeadlinesOpen}
                onClose={() => setIsDeadlinesOpen(false)}
                deadlines={deadlines}
                onSaved={fetchData}
            />
            
            {/* Modal de evaluación de jurado */}
            <ReviewModal
                isOpen={isReviewOpen}
                onClose={() => {
                    setIsReviewOpen(false);
                    setSelectedReview(null);
                }}
                review={selectedReview}
                deadlines={deadlines}
                onSuccess={fetchData}
            />

            {/* Modal de asignación / consulta de jurados (Admin) */}
            <AssignEvaluatorsModal
                isOpen={isAssignOpen}
                onClose={() => {
                    setIsAssignOpen(false);
                    setSelectedArticleForAssign(null);
                }}
                article={selectedArticleForAssign}
                onAssigned={fetchData}
            />
        </div>
    );
}