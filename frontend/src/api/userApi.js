import axios from 'axios';

const api = axios.create({
    baseURL: `http://${window.location.hostname}:8000/api/v1/`,
});

export const loginUser = async (credentials) => {
    return await api.post('/login/', credentials);
};

export const getUsers = async () => {
    return await api.get('/users/');
}

export const createUser = async (data) => {
    return await api.post('/users/', data);
}

export const deleteUser = async (id) => {
    return await api.delete(`/users/${id}/`);
}

export const getRoles = async () => {
    return await api.get('/roles/');
}

// Envia la solicitud de pin por correo
export const requestPasswordReset = async (email) => {
    return await api.post('/password-reset/request/', { email });
}

// Valida pin y actualiza contrasena
export const confirmPasswordReset = async (data) => {
    return await api.post('/password-reset/confirm/', data);
}