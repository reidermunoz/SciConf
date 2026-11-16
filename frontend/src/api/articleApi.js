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
    return await api.post('/articles/', data);
};

// Modificar datos del artículo (solo autor propietario / admin)
export const updateArticle = async (id, data) => {
    return await api.patch(`/articles/${id}/`, data);
};

// Deshabilitar / Reactivar artículo para la conferencia (solo comité científico / admin)
export const disableArticle = async (id, { is_active, deactivation_reason }) => {
    return await api.post(`/articles/${id}/disable/`, { is_active, deactivation_reason });
};

export default api;
