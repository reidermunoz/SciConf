import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { getArticles, getMyReviews, assignAllEvaluators, getDeadlines } from '../../api/articleApi';
import UploadVersionModal from '../../components/articles/UploadVersionModal';
import ReviewModal from '../../components/articles/ReviewModal';

export default function Versions() {

    const { user: currentUser, isAdmin, isCommittee, isAuthor } = useAuth();

    // Pestaña activa ('my-articles' o 'my-reviews')
    const [activeTab, setActiveTab] = useState(isCommittee && !isAuthor ? 'my-reviews' : 'my-articles');

    // Datos
    const [myArticles, setMyArticles] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    const [deadlines, setDeadlines] = useState(null);
    const [loading, setLoading] = useState(true);
    const [assigningAll, setAssigningAll] = useState(false);

    // Modales
    const [selectedArticleForUpload, setSelectedArticleForUpload] = useState(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

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
                            : artRes.data.filter((a) => a.author === currentUser?.id);
                        setMyArticles(filtered);
                    })
                );
            }

            if (isCommittee || isAdmin) {
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

    // Asignación masiva de evaluadores (solo Admin)
    const handleAssignAll = async () => {
        if (!window.confirm('¿Deseas asignar 3 evaluadores del comité científico a todos los artículos en estado POSTULADO?')) {
            return;
        }
        setAssigningAll(true);
        try {
            const res = await assignAllEvaluators();
            toast.success(res.data.message || 'Evaluadores asignados con éxito');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al asignar evaluadores');
        } finally {
            setAssigningAll(false);
        }
    };

    // Color del badge de estado
    const getStatusBadge = (status) => {
        const map = {
            POSTULADO: 'bg-blue-100 text-blue-800',
            EN_REVISION: 'bg-amber-100 text-amber-800',
            ACEPTADO: 'bg-green-100 text-green-800',
            RECHAZADO: 'bg-red-100 text-red-800',
            CORRECCION_ENTREGADA: 'bg-indigo-100 text-indigo-800',
            CON_AVAL_PRESENTACION: 'bg-teal-100 text-teal-800',
            FINAL_ENTREGADO: 'bg-purple-100 text-purple-800',
            CON_AVAL_PUBLICACION: 'bg-emerald-100 text-emerald-800',
        };
        return map[status] || 'bg-gray-100 text-gray-700';
    };

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

                    {/* Acción especial de Administrador */}
                    {isAdmin && (
                        <button
                            onClick={handleAssignAll}
                            disabled={assigningAll}
                            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 transition disabled:opacity-50"
                        >
                            {assigningAll ? 'Asignando...' : '⚡ Asignar 3 evaluadores a postulados'}
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
                        📄 Artículos y Versiones ({myArticles.length})
                    </button>
                )}
                {(isCommittee || isAdmin) && (
                    <button
                        onClick={() => setActiveTab('my-reviews')}
                        className={`border-b-2 px-5 py-3 text-sm font-medium transition ${
                            activeTab === 'my-reviews'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        ⚖️ Mis Revisiones Asignadas ({myReviews.length})
                    </button>
                )}
            </div>
            
            {/* Contenido según pestaña */}
            {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                    Cargando información...
                </div>
            ) : activeTab === 'my-articles' ? (

                /* TAB 1: Artículos del Autor */
                <div className="flex flex-col gap-4">
                    {myArticles.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                            <p className="text-gray-600 font-medium">No tienes artículos postulados.</p>
                            <p className="text-xs text-gray-400 mt-1">Crea un artículo en el módulo de Artículos para comenzar.</p>
                        </div>
                    ) : (
                        myArticles.map((art) => (
                            <div key={art.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                {art.thematic_line}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(art.status)}`}>
                                                {art.status}
                                            </span>
                                        </div>
                                        <h3 className="mt-1 text-lg font-bold text-gray-800">{art.title}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Autor: {art.author_name}</p>
                                    </div>
                                    
                                    {/* Botón para subir versión */}
                                    <button
                                        onClick={() => {
                                            setSelectedArticleForUpload(art);
                                            setIsUploadOpen(true);
                                        }}
                                        className="shrink-0 rounded-lg bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition"
                                    >
                                        📤 Subir / Cambiar Versión
                                    </button>
                                </div>
                                
                                {/* Versiones entregadas */}
                                <div className="mt-4 border-t pt-3">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Versiones entregadas:
                                    </h4>
                                    {art.versions && art.versions.length > 0 ? (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {art.versions.map((ver) => (
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
                                            ⚠️ Aún no has subido el PDF de la propuesta inicial para este artículo.
                                        </p>
                                    )}
                                </div>
                                
                                {/* Observaciones de jurados si existen */}
                                {art.reviews && art.reviews.some((r) => r.comments) && (
                                    <div className="mt-4 border-t pt-3">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                            Retroalimentación del Comité Científico:
                                        </h4>
                                        <div className="flex flex-col gap-2">
                                            {art.reviews
                                                .filter((r) => r.comments)
                                                .map((r, idx) => (
                                                    <div key={r.id} className="rounded-xl bg-gray-50/80 p-3 border border-gray-100 text-xs">
                                                        <span className="font-semibold text-gray-700">Jurado {idx + 1}: </span>
                                                        <span className="text-gray-600 italic">"{r.comments}"</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
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
                            {myReviews.map((rev) => (
                                <div key={rev.id} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-400">Revisión #{rev.id}</span>
                                            {rev.is_approved !== null ? (
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rev.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {rev.is_approved ? '✓ Aprobado' : '✕ Rechazado'}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="mt-2 text-base font-bold text-gray-800 line-clamp-2">
                                            {rev.article_title}
                                        </h3>
                                        
                                        {/* Estado de avales */}
                                        <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
                                            <p>
                                                Aval Presentación:{' '}
                                                <span className={rev.presentation_endorsement ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                                    {rev.presentation_endorsement ? 'Emitido' : 'Pendiente'}
                                                </span>
                                            </p>
                                            <p>
                                                Aval Publicación:{' '}
                                                <span className={rev.publication_endorsement ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                                    {rev.publication_endorsement ? 'Emitido' : 'Pendiente'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedReview(rev);
                                            setIsReviewOpen(true);
                                        }}
                                        className="mt-4 w-full rounded-lg bg-brand-50 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition"
                                    >
                                        📝 Evaluar / Gestionar Avales
                                    </button>
                                </div>
                            ))}
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
                }}
                article={selectedArticleForUpload}
                onSuccess={fetchData}
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
        </div>
    );
}