import api from './client';

// Autenticación
export const loginUser = async (credentials) => {
    return await api.post('/login/', credentials);
};

// CAPTCHA
export const getCaptcha = async () => {
    return await api.get('/captcha/');
};

// Usuarios
export const getUsers = async () => {
    return await api.get('/users/');
};

export const getUser = async (id) => {
    return await api.get(`/users/${id}/`);
};

export const createUser = async (data) => {
    return await api.post('/users/', data);
};

export const deleteUser = async (id) => {
    return await api.delete(`/users/${id}/`);
};

export const updateUser = async (id, data) => {
    return await api.patch(`/users/${id}/`, data);
};

// Roles
export const getRoles = async () => {
    return await api.get('/roles/');
};

// Recuperación de contraseña
export const requestPasswordReset = async (email) => {
    return await api.post('/password-reset/request/', { email });
};

// Valida pin y actualiza contraseña
export const confirmPasswordReset = async (data) => {
    return await api.post('/password-reset/confirm/', data);
};

export default api;
