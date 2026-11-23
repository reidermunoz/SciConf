import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getArticles, getDeadlines, THEMATIC_LINES } from '../../api/articleApi';
import useAuth from '../../hooks/useAuth';
import ArticleModal from '../../components/articles/ArticleModal';
import ArticleDetailModal from '../../components/articles/ArticleDetailModal';
import DisableArticleModal from '../../components/articles/DisableArticleModal';
import AssignEvaluatorsModal from '../../components/articles/AssignEvaluatorsModal';
import ReviewModal from '../../components/articles/ReviewModal';
import UploadVersionModal from '../../components/articles/UploadVersionModal';

const ARTICLE_STATUS_OPTIONS = [
    { value: 'POSTULADO', label: 'POSTULADO', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'EN_REVISION', label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'ACEPTADO', label: 'ACEPTADO', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'RECHAZADO', label: 'RECHAZADO', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'CON_AVAL_PRESENTACION', label: 'CON AVAL PARA PRESENTACIÓN', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'CON_AVAL_PUBLICACION', label: 'CON AVAL PARA PUBLICACIÓN', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const EXTRA_STATUS_BADGES = {
    CORRECCION_ENTREGADA: { label: 'CORRECCIÓN ENTREGADA', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    FINAL_ENTREGADO: { label: 'VERSIÓN FINAL ENTREGADA', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const getStatusBadge = (status) => {
    const found = ARTICLE_STATUS_OPTIONS.find((opt) => opt.value === status) || EXTRA_STATUS_BADGES[status];
    return found || { label: status || 'POSTULADO', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
};

export default function Articles() {

    const { user: currentUser, isAdmin, isCommittee, isAuthor, canCreateArticle } = useAuth();

    // Estados de datos
    const [articles, setArticles] = useState([]);
    const [deadlines, setDeadlines] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estados de filtros (al menos 2 filtros: línea temática y estado de habilitación + búsqueda)
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [thematicFilter, setThematicFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Estados para controlar los modales
    const [isCreateOrEditOpen, setIsCreateOrEditOpen] = useState(false);
    const [selectedArticleToEdit, setSelectedArticleToEdit] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedArticleDetail, setSelectedArticleDetail] = useState(null);
    const [isDisableOpen, setIsDisableOpen] = useState(false);
    const [selectedArticleToDisable, setSelectedArticleToDisable] = useState(null);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedArticleToAssign, setSelectedArticleToAssign] = useState(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedArticleForUpload, setSelectedArticleForUpload] = useState(null);
    const [uploadFixedType, setUploadFixedType] = useState('CORREGIDA');
    
    // Debounce solo al escribir en búsqueda; la carga inicial y los selectores son inmediatos
    useEffect(() => {
        if (!search) {
            setDebouncedSearch('');
            return;
        }
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    // Cargar artículos aplicando filtros en backend
    const fetchArticles = useCallback(async (isManual = false) => {
        setLoading(true);
        try {
            const params = {};
            if (thematicFilter) params.thematic_line = thematicFilter;
            if (statusFilter !== '') params.status = statusFilter;
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            const res = await getArticles(params);
            const activeArticles = res.data.filter((a) => a.is_active !== false);
            const visibleArticles = (isAdmin || isCommittee)
                ? activeArticles
                : activeArticles.filter((a) => a.author === currentUser?.id);
            setArticles(visibleArticles);
            if (isManual) {
                toast.success('Lista de artículos actualizada');
            }
        } catch {
            toast.error('Error al cargar la lista de artículos.');
        } finally {
            setLoading(false);
        }
    }, [thematicFilter, statusFilter, debouncedSearch, isAdmin, isCommittee, currentUser?.id]);

    useEffect(() => {
        fetchArticles();
        getDeadlines()
            .then((res) => setDeadlines(res.data))
            .catch(() => {});
    }, [fetchArticles]);

    // Limpiar todos los filtros
    const handleResetFilters = () => {
        setSearch('');
        setThematicFilter('');
        setStatusFilter('');
    };

    // Abre el modal para crear nuevo
    const handleOpenCreate = () => {
        setSelectedArticleToEdit(null);
        setIsCreateOrEditOpen(true);
    };

    // Abre el modal para editar (solo propietario o admin)
    const handleOpenEdit = (article) => {
        setSelectedArticleToEdit(article);
        setIsCreateOrEditOpen(true);
    };

    // Abre el modal de detalle
    const handleOpenDetail = (article) => {
        setSelectedArticleDetail(article);
        setIsDetailOpen(true);
    };

    // Abre el modal de deshabilitar (solo comité o admin)
    const handleOpenDisable = (article) => {
        setSelectedArticleToDisable(article);
        setIsDisableOpen(true);
    };

    // Abre el modal de asignación manual/asistida de jurados (solo comité o admin)
    const handleOpenAssign = (article) => {
        setSelectedArticleToAssign(article);
        setIsAssignOpen(true);
    };

    const isSubmissionOpen =
        !deadlines?.submissions_deadline ||
        new Date() <= new Date(deadlines.submissions_deadline);
    const isCorrectionOpen =
        !deadlines?.corrections_deadline ||
        new Date() <= new Date(deadlines.corrections_deadline);
    const isFinalOpen =
        !deadlines?.final_deadline ||
        new Date() <= new Date(deadlines.final_deadline);

    // Determina si el usuario logueado puede editar este artículo en específico (solo su propio autor antes del plazo)
    const canUserEdit = (article) => {
        return isAuthor && article.author === currentUser?.id && isSubmissionOpen;
    };

    const handleOpenReview = (review) => {
        setSelectedReview(review);
        setIsReviewOpen(true);
    };

    const handleOpenUpload = (article, fixedType = 'CORREGIDA') => {
        setSelectedArticleForUpload(article);
        setUploadFixedType(fixedType);
        setIsUploadOpen(true);
    };
    return (
        <div className="flex flex-col gap-6">

            {/* Cabecera */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestión de Artículos</h2>
                    <p className="text-sm text-gray-500">
                        Consulta, propuesta y evaluación de ponencias científicas postuladas para la conferencia.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => fetchArticles(true)}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:text-brand-600 transition disabled:opacity-60"
                        title="Actualizar artículos desde la base de datos"
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
                    {canCreateArticle && (
                        <button
                            onClick={handleOpenCreate}
                            disabled={!isSubmissionOpen}
                            title={!isSubmissionOpen ? 'El plazo de postulaciones ha finalizado' : 'Proponer nuevo artículo'}
                            className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            + Proponer artículo
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    
                    {/* Búsqueda por texto */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">Buscar por título</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar título..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                    
                    {/* Filtro 1: Línea Temática */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">Línea temática</label>
                        <select
                            value={thematicFilter}
                            onChange={(e) => setThematicFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Todas las líneas</option>
                            {THEMATIC_LINES.map((line) => (
                                <option key={line} value={line}>
                                    {line}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro 2: Estado real del artículo */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">Estado en conferencia</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Todos los estados</option>
                            {ARTICLE_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botón de limpiar filtros */}
                    <div className="flex items-end">
                        {(search || thematicFilter || statusFilter !== '') && (
                            <button
                                onClick={handleResetFilters}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla de Artículos */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-3.5">Título</th>
                                <th className="px-6 py-3.5">Línea Temática</th>
                                <th className="px-6 py-3.5">Autor</th>
                                <th className="px-6 py-3.5">Estado</th>
                                <th className="px-6 py-3.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-gray-500">
                                        Cargando artículos...
                                    </td>
                                </tr>
                            ) : articles.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-gray-500">
                                        No se encontraron artículos con los criterios seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                articles.map((article) => (
                                    <tr key={article.id} className="hover:bg-gray-50/75 transition">
                                        
                                        {/* Título */}
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900 line-clamp-1">
                                                {article.title}
                                            </p>
                                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                {article.abstract}
                                            </p>
                                        </td>
                                        
                                        {/* Línea Temática */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                                                {article.thematic_line}
                                            </span>
                                        </td>
                                        
                                        {/* Autor */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="font-medium text-gray-800">{article.author_name}</p>
                                            <p className="text-xs text-gray-400">{article.author_email}</p>
                                        </td>
                                        
                                        {/* Estado real del ciclo de revisión */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const badge = getStatusBadge(article.status);
                                                return (
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        
                                        {/* Acciones */}
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            {(() => {
                                                const assignedReview = article.reviews?.find((r) => r.evaluator === currentUser?.id);
                                                const reviewersCount = article.reviews?.length || 0;
                                                const canUploadCorrection =
                                                    isAuthor &&
                                                    article.author === currentUser?.id &&
                                                    article.status === 'ACEPTADO' &&
                                                    isCorrectionOpen;
                                                const canUploadFinal =
                                                    isAuthor &&
                                                    article.author === currentUser?.id &&
                                                    article.status === 'CON_AVAL_PRESENTACION' &&
                                                    isFinalOpen;
                                                return (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Ver Detalle (todos los roles) */}
                                                        <button
                                                            onClick={() => handleOpenDetail(article)}
                                                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
                                                            title="Ver información detallada"
                                                        >
                                                            👁️ Ver
                                                        </button>

                                                        {/* Autor: Editar (oculto cuando vence la fecha límite de postulaciones) */}
                                                        {canUserEdit(article) && (
                                                            <button
                                                                onClick={() => handleOpenEdit(article)}
                                                                className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition"
                                                                title="Modificar artículo"
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                        )}

                                                        {/* Autor: Subir versión (ACEPTADO -> Corregida, CON_AVAL_PRESENTACION -> Final + Copyright) */}
                                                        {isAuthor && article.author === currentUser?.id && (
                                                            article.status === 'CON_AVAL_PRESENTACION' ? (
                                                                <button
                                                                    onClick={() => handleOpenUpload(article, 'FINAL')}
                                                                    disabled={!canUploadFinal}
                                                                    className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-50 transition text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                                                                    title={
                                                                        !isFinalOpen
                                                                            ? 'El plazo de entrega final ha finalizado'
                                                                            : 'Subir versión final y copyright (PDF)'
                                                                    }
                                                                >
                                                                    📤 Subir Versión Final y Copyright
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenUpload(article, 'CORREGIDA')}
                                                                    disabled={!canUploadCorrection}
                                                                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                                                                    title={
                                                                        article.status !== 'ACEPTADO'
                                                                            ? 'Disponible cuando el artículo sea ACEPTADO'
                                                                            : !isCorrectionOpen
                                                                            ? 'El plazo de entrega de correcciones ha finalizado'
                                                                            : 'Subir versión corregida (PDF)'
                                                                    }
                                                                >
                                                                    📤 Subir versión
                                                                </button>
                                                            )
                                                        )}

                                                        {/* Comité: Evaluar (solo si está asignado como jurado) */}
                                                        {isCommittee && assignedReview && (
                                                            <button
                                                                onClick={() => handleOpenReview(assignedReview)}
                                                                className="rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                                                                title="Evaluar artículo y emitir avales"
                                                            >
                                                                📝 Evaluar
                                                            </button>
                                                        )}

                                                        {/* Comité y Admin: Asignar jurados con conteo */}
                                                        {(isCommittee || isAdmin) && (
                                                            <button
                                                                onClick={() => handleOpenAssign(article)}
                                                                className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 transition text-xs font-medium"
                                                                title="Asignar jurados (manual o sugerido por temática)"
                                                            >
                                                                👥 Jurados ({reviewersCount}/3)
                                                            </button>
                                                        )}

                                                        {/* Comité: Deshabilitar (exclusivo del Comité Científico) */}
                                                        {isCommittee && (
                                                            <button
                                                                onClick={() => handleOpenDisable(article)}
                                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition text-xs font-medium"
                                                                title="Deshabilitar artículo de la conferencia"
                                                            >
                                                                🚫 Deshabilitar
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modales */}
            <ArticleModal
                isOpen={isCreateOrEditOpen}
                onClose={() => setIsCreateOrEditOpen(false)}
                onSaved={fetchArticles}
                articleToEdit={selectedArticleToEdit}
            />
            <ArticleDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                article={selectedArticleDetail}
            />
            <DisableArticleModal
                isOpen={isDisableOpen}
                onClose={() => setIsDisableOpen(false)}
                onUpdated={fetchArticles}
                article={selectedArticleToDisable}
            />
            <AssignEvaluatorsModal
                isOpen={isAssignOpen}
                onClose={() => setIsAssignOpen(false)}
                onAssigned={fetchArticles}
                article={selectedArticleToAssign}
            />
            <ReviewModal
                isOpen={isReviewOpen}
                onClose={() => {
                    setIsReviewOpen(false);
                    setSelectedReview(null);
                }}
                review={selectedReview}
                deadlines={deadlines}
                onSuccess={fetchArticles}
            />
            <UploadVersionModal
                isOpen={isUploadOpen}
                onClose={() => {
                    setIsUploadOpen(false);
                    setSelectedArticleForUpload(null);
                }}
                article={selectedArticleForUpload}
                fixedVersionType={uploadFixedType}
                deadlines={deadlines}
                onSuccess={fetchArticles}
            />
        </div>
    );
}