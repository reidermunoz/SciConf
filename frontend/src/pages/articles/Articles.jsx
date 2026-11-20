import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getArticles, THEMATIC_LINES } from '../../api/articleApi';
import useAuth from '../../hooks/useAuth';
import ArticleModal from '../../components/articles/ArticleModal';
import ArticleDetailModal from '../../components/articles/ArticleDetailModal';
import DisableArticleModal from '../../components/articles/DisableArticleModal';

export default function Articles() {

    const { user: currentUser, isAdmin, canCreateArticle, canDisableArticle } = useAuth();

    // Estados de datos
    const [articles, setArticles] = useState([]);
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
            if (statusFilter !== '') params.is_active = statusFilter;
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            const res = await getArticles(params);
            setArticles(res.data);
            if (isManual) {
                toast.success('Lista de artículos actualizada');
            }
        } catch {
            toast.error('Error al cargar la lista de artículos.');
        } finally {
            setLoading(false);
        }
    }, [thematicFilter, statusFilter, debouncedSearch]);

    useEffect(() => {
        fetchArticles();
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

    // Determina si el usuario logueado puede editar este artículo en específico
    const canUserEdit = (article) => {
        if (isAdmin) return true;
        return article.author === currentUser?.id;
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
                            className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600 transition shadow-sm"
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

                    {/* Filtro 2: Estado de Habilitación */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">Estado en conferencia</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="true">Habilitados</option>
                            <option value="false">Deshabilitados</option>
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
                                        
                                        {/* Estado */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {article.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                    Habilitado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                                    Deshabilitado
                                                </span>
                                            )}
                                        </td>
                                        
                                        {/* Acciones */}
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                
                                                {/* Ver Detalle */}
                                                <button
                                                    onClick={() => handleOpenDetail(article)}
                                                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
                                                    title="Ver información detallada"
                                                >
                                                    👁️ Ver
                                                </button>
                                                
                                                {/* Modificar (Solo autor del artículo o admin) */}
                                                {canUserEdit(article) && (
                                                    <button
                                                        onClick={() => handleOpenEdit(article)}
                                                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition"
                                                        title="Modificar artículo"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                )}
                                                
                                                {/* Deshabilitar / Reactivar (Solo Comité o Admin) */}
                                                {canDisableArticle && (
                                                    <button
                                                        onClick={() => handleOpenDisable(article)}
                                                        className={`rounded-lg p-1.5 transition text-xs font-medium ${
                                                            article.is_active
                                                                ? 'text-red-600 hover:bg-red-50'
                                                                : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                        title={
                                                            article.is_active
                                                                ? 'Deshabilitar de la conferencia'
                                                                : 'Habilitar para la conferencia'
                                                        }
                                                    >
                                                        {article.is_active ? '🚫 Deshabilitar' : '🔄 Habilitar'}
                                                    </button>
                                                )}
                                            </div>
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
        </div>
    );
}