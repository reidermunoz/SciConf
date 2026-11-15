import axios from 'axios';

const api = axios.create({
    baseURL: `http://${window.location.hostname}:8000/api/v1/`,
});

// Interceptor que anade el token JWT a cada request automaticamente
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if(token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Autenticacion
export const loginUser = async (credentials) => {
    return await api.post('/login/', credentials);
};

// CAPTCHA
export const getCaptcha = async () => {
    return await api.get('/captcha/');
}

// Usuarios
export const getUsers = async () => {
    return await api.get('/users/');
}

export const createUser = async (data) => {
    return await api.post('/users/', data);
}

export const deleteUser = async (id) => {
    return await api.delete(`/users/${id}/`);
}

export const updateUser = async (id, data) => {
    return await api.patch(`/users/${id}/`, data);
}

// Roles
export const getRoles = async () => {
    return await api.get('/roles/');
}

// Recuperacion de contrasena
export const requestPasswordReset = async (email) => {
    return await api.post('/password-reset/request/', { email });
}

// Valida pin y actualiza contrasena
export const confirmPasswordReset = async (data) => {
    return await api.post('/password-reset/confirm/', data);
}
