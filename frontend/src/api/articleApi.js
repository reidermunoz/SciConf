import api from './client';

// Constantes de Líneas Temáticas disponibles
export const THEMATIC_LINES = [
    'Sistemas Inteligentes',
    'Tecnologias en informática',
    'Educación en informática',
    'Sistemas de software',
    'Software en la práctica',
];

// Obtener artículos con soporte para filtros (?thematic_line=...&is_active=...&search=...)
export const getArticles = async (params = {}) => {
    return await api.get('/articles/', { params });
};

// Obtener detalle de un artículo por ID
export const getArticle = async (id) => {
    return await api.get(`/articles/${id}/`);
};

// Crear nuevo artículo (solo autores / admin)
export const createArticle = async (data) => {
    const config = data instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};
    return await api.post('/articles/', data, config);
};

// Modificar datos del artículo (solo autor propietario / admin)
export const updateArticle = async (id, data) => {
    const config = data instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};
    return await api.patch(`/articles/${id}/`, data, config);
};

// Deshabilitar / Reactivar artículo para la conferencia (solo comité científico / admin)
export const disableArticle = async (id, { is_active, deactivation_reason }) => {
    return await api.post(`/articles/${id}/disable/`, { is_active, deactivation_reason });
};

export default api;

// --- Versiones y subida de archivos PDF ---
export const uploadArticleVersion = async (articleId, formData) => {
    return await api.post(`/articles/${articleId}/upload-version/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// --- Asignación de evaluadores (Comité / Admin) ---
export const getSuggestedEvaluators = async (articleId) => {
    return await api.get(`/articles/${articleId}/suggest-evaluators/`);
};

export const assignEvaluators = async (articleId, evaluatorIds = null) => {
    const payload = Array.isArray(evaluatorIds) ? { evaluator_ids: evaluatorIds } : {};
    return await api.post(`/articles/${articleId}/assign-evaluators/`, payload);
};

export const assignAllEvaluators = async () => {
    return await api.post('/articles/assign-all-evaluators/');
};

// --- Revisiones y Avales (Jurados del Comité) ---
export const getMyReviews = async () => {
    return await api.get('/reviews/');
};

export const submitReviewEvaluation = async (
    reviewId,
    { comments, is_approved, originality_score, relevance_score, technical_quality_score }
) => {
    return await api.post(`/reviews/${reviewId}/submit-evaluation/`, {
        comments,
        is_approved,
        originality_score,
        relevance_score,
        technical_quality_score,
    });
};

export const endorsePresentation = async (reviewId, approved = true) => {
    return await api.post(`/reviews/${reviewId}/endorse-presentation/`, { approved });
};

export const endorsePublication = async (reviewId) => {
    return await api.post(`/reviews/${reviewId}/endorse-publication/`);
};

// --- Fechas límite de la conferencia ---
export const getDeadlines = async () => {
    return await api.get('/deadlines/');
};

export const updateDeadlines = async (data) => {
    const config = data instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};
    return await api.post('/deadlines/', data, config);
};

export const downloadCopyrightTemplate = async () => {
    const response = await api.get('/deadlines/copyright-template/', {
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_copyright.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};